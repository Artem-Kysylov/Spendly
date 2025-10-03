
// Модуль: /api/assistant
import { NextRequest } from 'next/server'
import { aiResponse, executeTransaction, prepareUserContext, isComplexRequest, selectModel, composeLLMPrompt } from '@/app/actions/aiAssistant'
import { getServerSupabaseClient } from '@/lib/serverSupabase'
import { streamOpenAIText } from '@/lib/llm/openai'
import { streamGeminiText } from '@/lib/llm/google'

// Минимальный стрим: нарезка строки по частям
function streamText(text: string) {
  const encoder = new TextEncoder()
  const chunks = text.match(/.{1,40}/g) || [text]

  return new Response(
    new ReadableStream({
      start(controller) {
        let i = 0
        const push = () => {
          if (i >= chunks.length) {
            controller.close()
            return
          }
          controller.enqueue(encoder.encode(chunks[i]))
          i++
          setTimeout(push, 60)
        }
        push()
      }
    }),
    {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    }
  )
}

async function verifyUserId(userId: string): Promise<boolean> {
  try {
    const supabase = getServerSupabaseClient()
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    return !!data?.user && !error
  } catch {
    return false
  }
}

async function getTodayUsageCount(userId: string): Promise<number> {
  const supabase = getServerSupabaseClient()
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  const { count, error } = await supabase
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())

  if (error) {
    return 0
  }
  return count ?? 0
}

async function checkLimits(userId: string, isPro: boolean, enableLimits: boolean): Promise<{ ok: boolean; reason?: string }> {
  if (!enableLimits) return { ok: true }
  if (isPro) return { ok: true }

  const dailyLimit = Number(process.env.FREE_DAILY_LIMIT ?? '50')
  const used = await getTodayUsageCount(userId)
  if (used >= dailyLimit) {
    return { ok: false, reason: `Daily limit reached (${dailyLimit} requests). Please try again tomorrow.` }
  }
  return { ok: true }
}

async function logUsage(entry: {
  userId: string
  provider: 'openai' | 'gemini'
  model: string
  promptLength: number
  responseLength: number
  success: boolean
  errorMessage?: string
}) {
  try {
    const supabase = getServerSupabaseClient()
    await supabase
      .from('ai_usage_logs')
      .insert({
        user_id: entry.userId,
        provider: entry.provider,
        model: entry.model,
        prompt_length: entry.promptLength,
        response_length: entry.responseLength,
        success: entry.success,
        error_message: entry.errorMessage ?? null,
        created_at: new Date().toISOString()
      })
  } catch {
    // no-op
  }
}

// Проксируем стрим провайдера, одновременно измеряя размер ответа и пишем usage‑лог по завершении
function streamProviderWithUsage(providerStream: ReadableStream<string>, meta: { userId: string; provider: 'openai' | 'gemini'; model: string; promptLength: number }) {
  const encoder = new TextEncoder()
  let responseLength = 0

  const out = new ReadableStream({
    start(controller) {
      const reader = providerStream.getReader()
      const loop = async () => {
        try {
          const { done, value } = await reader.read()
          if (done) {
            controller.close()
            await logUsage({
              userId: meta.userId,
              provider: meta.provider,
              model: meta.model,
              promptLength: meta.promptLength,
              responseLength,
              success: true
            })
            return
          }
          const chunk = typeof value === 'string' ? value : String(value ?? '')
          responseLength += chunk.length
          controller.enqueue(encoder.encode(chunk))
          loop()
        } catch (e) {
          controller.error(e)
        }
      }
      loop()
    },
    cancel() {
      // При отмене тоже попробуем залогировать
      void logUsage({
        userId: meta.userId,
        provider: meta.provider,
        model: meta.model,
        promptLength: meta.promptLength,
        responseLength,
        success: false,
        errorMessage: 'Stream canceled by client'
      })
    }
  })

  return new Response(out, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Provider': meta.provider,
      'X-Model': meta.model
    }
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, isPro = false, enableLimits = false, message, confirm = false, actionPayload } = body || {}

  if (!userId || !message) {
    return new Response(JSON.stringify({ error: 'Missing userId or message' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  // Верификация пользователя из авторизованной сессии
  const isValidUser = await verifyUserId(userId)
  if (!isValidUser) {
    return new Response(JSON.stringify({ error: 'Invalid user session.' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  // Защита от злоупотреблений: ограничиваем размер prompt/контекста
  const MAX_PROMPT = Number(process.env.MAX_PROMPT_CHARS ?? '4000')
  const safeMessage = String(message).slice(0, MAX_PROMPT)

  // Проверка лимитов (для не‑pro пользователей)
  const limits = await checkLimits(userId, isPro, enableLimits)
  if (!limits.ok) {
    await logUsage({
      userId,
      provider: 'gemini', // по умолчанию
      model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
      promptLength: safeMessage.length,
      responseLength: 0,
      success: false,
      errorMessage: limits.reason
    })
    return new Response(JSON.stringify({ error: limits.reason }), { status: 429, headers: { 'Content-Type': 'application/json' } })
  }

  // Подтверждение — исполняем и отдаём JSON
  if (confirm && actionPayload) {
    const res = await executeTransaction(userId, actionPayload)
    return new Response(JSON.stringify({ kind: 'message', ok: res.ok, message: res.message, shouldRefetch: res.ok }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Сначала проверим, не action ли
  const pre = await aiResponse({ userId, isPro, enableLimits, message: safeMessage })
  if (pre.kind === 'action') {
    return new Response(JSON.stringify(pre), { headers: { 'Content-Type': 'application/json' } })
  }

  // Реальный стрим от провайдера
  const ctx = await prepareUserContext(userId)
  const prompt = composeLLMPrompt(ctx, safeMessage)
  const complex = isComplexRequest(safeMessage)

  const preferredProvider = (process.env.AI_PROVIDER ?? '').toLowerCase()
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const hasGemini = !!process.env.GOOGLE_API_KEY

  let provider: 'openai' | 'gemini' = 'gemini'
  if (preferredProvider === 'openai' && hasOpenAI) provider = 'openai'
  else if (preferredProvider === 'gemini' && hasGemini) provider = 'gemini'
  else {
    // Авто по сложности: OpenAI для комплексных, иначе Gemini
    provider = complex && hasOpenAI ? 'openai' : 'gemini'
  }

  try {
    if (provider === 'openai') {
      const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
      const stream = streamOpenAIText({ model, prompt, system: 'You are Spendly assistant.' })
      return streamProviderWithUsage(stream, { userId, provider: 'openai', model, promptLength: prompt.length })
    } else {
      const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
      const stream = streamGeminiText({ model, prompt, system: 'You are Spendly assistant.' })
      return streamProviderWithUsage(stream, { userId, provider: 'gemini', model, promptLength: prompt.length })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown provider error'
    await logUsage({
      userId,
      provider,
      model: provider === 'openai' ? (process.env.OPENAI_MODEL ?? 'gpt-4o-mini') : (process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'),
      promptLength: prompt.length,
      responseLength: 0,
      success: false,
      errorMessage: msg
    })
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}