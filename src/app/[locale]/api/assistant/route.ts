// Module: /api/assistant
import { NextRequest } from 'next/server'
import { aiResponse, executeTransaction, getCanonicalEmptyReply } from '@/app/[locale]/actions/aiAssistant'
import { composeLLMPrompt } from '@/prompts/spendlyPal/composeLLMPrompt'
import { PROMPT_VERSION } from '@/prompts/spendlyPal/promptVersion'
import { prepareUserContext } from '@/lib/ai/context'
import { isComplexRequest, selectModel } from '@/lib/ai/routing'
import { detectPeriodFromMessage, detectIntentFromMessage } from '@/lib/ai/intent'
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
  provider: 'openai' | 'gemini' | 'canonical'
  model: string
  promptLength: number
  responseLength: number
  success: boolean
  errorMessage?: string
  intent?: string
  period?: string
  bypassUsed?: boolean
  blockReason?: string
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
        intent: entry.intent ?? null,
        period: entry.period ?? null,
        bypass_used: entry.bypassUsed ?? null,
        block_reason: entry.blockReason ?? null,
        created_at: new Date().toISOString()
      })
  } catch {
    // no-op
  }
}

// Проксируем стрим провайдера, одновременно измеряя размер ответа и пишем usage‑лог по завершении
function streamProviderWithUsage(
  providerStream: ReadableStream<string>,
  meta: {
    requestId: string;
    userId: string;
    provider: 'openai' | 'gemini';
    model: string;
    promptLength: number;
    intent?: string;
    period?: string;
    locale?: string;
    currency?: string;
  }
) {
  const encoder = new TextEncoder()
  let responseLength = 0
  const debug = (process.env.LLM_DEBUG === '1' || process.env.LLM_DEBUG === 'true')
  const startTs = Date.now()
  let firstChunkTs: number | null = null

  const out = new ReadableStream({
    start(controller) {
      const reader = providerStream.getReader()
      const loop = async () => {
        try {
          const { done, value } = await reader.read()
          if (done) {
            controller.close()
            if (debug) {
              const durationMs = Date.now() - startTs
              const ttfbMs = firstChunkTs ? (firstChunkTs - startTs) : null
              try {
                console.debug('[LLM_DEBUG stream]', JSON.stringify({
                  requestId: meta.requestId,
                  provider: meta.provider,
                  model: meta.model,
                  promptLength: meta.promptLength,
                  responseLength,
                  ttfbMs,
                  durationMs,
                  intent: meta.intent,
                  period: meta.period
                }))
              } catch {
                // no-op
              }
            }
            await logUsage({
              userId: meta.userId,
              provider: meta.provider,
              model: meta.model,
              promptLength: meta.promptLength,
              responseLength,
              success: true,
              intent: meta.intent,
              period: meta.period,
              bypassUsed: false
            })
            return
          }
          const chunk = typeof value === 'string' ? value : String(value ?? '')
          responseLength += chunk.length
          if (firstChunkTs === null) firstChunkTs = Date.now()
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
        errorMessage: 'Stream canceled by client',
        intent: meta.intent,
        period: meta.period,
        bypassUsed: false,
        blockReason: 'client_canceled'
      })
    }
  })

  return new Response(out, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Provider': meta.provider,
      'X-Model': meta.model,
      'X-Request-Id': meta.requestId,
      'X-Prompt-Version': PROMPT_VERSION,
      'X-Intent': meta.intent || 'unknown',
      'X-Period': meta.period || 'unknown',
      'X-Locale': meta.locale || 'en-US',
      'X-Currency': meta.currency || 'USD',
      'X-Bypass': 'false'
    }
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, isPro = false, enableLimits = false, message, confirm = false, actionPayload } = body || {}

  const requestId = (typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
  const debug = (process.env.LLM_DEBUG === '1' || process.env.LLM_DEBUG === 'true')

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

  // Парсим локаль и назначаем валюту (MVP: ru -> RUB, иначе USD)
  const acceptLang = req.headers.get('accept-language') || ''
  const locale = acceptLang.split(',')[0] || 'en-US'
  const currency = locale.toLowerCase().startsWith('ru') ? 'RUB' : 'USD'

  // Определяем intent и период
  const intent = detectIntentFromMessage(safeMessage)
  const periodDetected = detectPeriodFromMessage(safeMessage)

  // Check a limits not a pro users 
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
    return new Response(JSON.stringify({ error: limits.reason }), { status: 429, headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId } })
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
  const promptRaw = composeLLMPrompt(ctx, safeMessage, { locale, currency, promptVersion: PROMPT_VERSION, maxChars: MAX_PROMPT })
  const prompt = typeof promptRaw === 'string' ? promptRaw : String(promptRaw ?? '')

  // Доп. диагностика: тип и первые 200 символов промпта
  if (debug) {
    try {
      console.debug('[LLM_DEBUG prompt sample]', JSON.stringify({
        requestId,
        promptType: typeof promptRaw,
        promptLengthChars: prompt.length,
        promptSample: prompt.slice(0, 200)
      }))
    } catch { /* no-op */ }
  }

  // Если prompt подозрительно короткий — используем его как системную директиву, а в user кладём исходное сообщение
  const isPromptTooShort = prompt.trim().length < 128
  const systemDefault = 'You are the Spendly assistant. Respond directly to the user request. Use the provided Weekly and Monthly sections depending on the request. Do not give application instructions, onboarding, UI steps, or how-to guides. Do not include greetings or introductions. Answer in plain text.'
  const systemForLLM = isPromptTooShort ? prompt : systemDefault
  const promptForLLM = isPromptTooShort ? safeMessage : prompt

  // Канонический ответ при пустых данных за период: отвечаем без LLM
  const canonical = getCanonicalEmptyReply(ctx, safeMessage, { locale })
  if (canonical.shouldBypass) {
    if (debug) {
      const approxTokens = Math.round(prompt.length / 4)
      console.debug('[LLM_DEBUG canonical pre-call]', JSON.stringify({
        requestId,
        userId,
        provider: 'canonical',
        model: 'canonical',
        promptVersion: PROMPT_VERSION,
        promptLengthChars: prompt.length,
        approxTokens,
        intent,
        period: canonical.period,
        bypassUsed: true
      }))
    }

    // Возвращаем JSON‑контракт (этап 1 локализации: ключи EN, текст UI строит сам)
    const jsonContract = {
      intent: 'summary',
      period: canonical.period,
      currency,
      totals: { expenses: 0 },
      breakdown: [],
      topExpenses: [],
      text: '',
      meta: { promptVersion: PROMPT_VERSION, locale, tokensApprox: Math.round(prompt.length / 4) }
    }

    await logUsage({
      userId,
      provider: 'canonical',
      model: 'canonical',
      promptLength: prompt.length,
      responseLength: JSON.stringify(jsonContract).length,
      success: true,
      intent,
      period: canonical.period,
      bypassUsed: true
    })

    return new Response(JSON.stringify(jsonContract), {
      headers: {
        'Content-Type': 'application/json',
        'X-Provider': 'canonical',
        'X-Model': 'canonical',
        'X-Request-Id': requestId,
        'X-Prompt-Version': PROMPT_VERSION,
        'X-Intent': intent,
        'X-Period': canonical.period,
        'X-Locale': locale,
        'X-Currency': currency,
        'X-Bypass': 'true'
      }
    })
  }

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

  if (debug) {
    try {
      const approxTokens = Number.isFinite(prompt.length) ? Math.round(prompt.length / 4) : null
      console.debug('[LLM_DEBUG pre-call]', JSON.stringify({
        requestId,
        userId,
        provider,
        model: provider === 'openai' ? (process.env.OPENAI_MODEL ?? 'gpt-4-turbo') : (process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'),
        promptVersion: PROMPT_VERSION,
        promptLengthChars: prompt.length,
        approxTokens,
        intent,
        period: periodDetected,
        bypassUsed: false,
        promptTooShort: isPromptTooShort
      }))
    } catch {
      // no-op
    }
  }

  try {
    if (provider === 'openai') {
      const model = process.env.OPENAI_MODEL ?? 'gpt-4-turbo'
      const stream = streamOpenAIText({
        model,
        prompt: promptForLLM,
        system: systemForLLM,
        requestId
      })
      return streamProviderWithUsage(stream, { requestId, userId, provider: 'openai', model, promptLength: prompt.length, intent, period: periodDetected, locale, currency })
    } else {
      const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
      const stream = streamGeminiText({
        model,
        prompt: promptForLLM,
        system: systemForLLM,
        requestId
      })
      return streamProviderWithUsage(stream, { requestId, userId, provider: 'gemini', model, promptLength: prompt.length, intent, period: periodDetected, locale, currency })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown provider error'
    await logUsage({
      userId,
      provider,
      model: provider === 'openai' ? (process.env.OPENAI_MODEL ?? 'gpt-4-turbo') : (process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'),
      promptLength: prompt.length,
      responseLength: 0,
      success: false,
      errorMessage: msg,
      intent,
      period: periodDetected,
      bypassUsed: false,
      blockReason: 'provider_error'
    })
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
