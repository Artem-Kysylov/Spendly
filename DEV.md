LLM Debug:
- Set LLM_DEBUG=1 to enable console diagnostics for OpenAI/Gemini calls.
- Pre-call: requestId, provider, model, promptLengthChars, approxTokens, parts lengths.
- Post-call: candidates count, parts lengths, blockReason, safetyRatings (Gemini), SSE lines and total text length (OpenAI).

Health-check:
- GET /api/llm/health responds with { ok, provider, model, durationMs, requestId, error?, blockReason? }.
- Chooses provider based on AI_PROVIDER and available API keys.

Block handling:
- Gemini empty candidates inject a readable message including Blocked: <reason>.
- Client replaces provider technical text with a friendly tip.

Canonical empty replies:
- If the user asks for "this week" or "last week" and no expenses recorded, reply immediately:
  - "No expenses recorded this week." / "No expenses recorded last week."
- Logged under [LLM_DEBUG canonical] with period and totals.

Mini-metrics:
- Usage rows include success/failure, prompt and response length.
- Additional LLM_DEBUG logs include durationMs (health-check) and requestId to correlate.

Risks and rollback:
- If provider instability leads to frequent blocks: fallback to canonical or reduce prompt complexity.
- Toggle AI_PROVIDER to switch providers quickly.
- Disable limits by setting enableLimits=false for debugging, or reduce FREE_DAILY_LIMIT for stricter throttling.