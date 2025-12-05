export function logLLMDebug(tag: string, payload: unknown) {
  const enabled =
    process.env.LLM_DEBUG === "1" || process.env.LLM_DEBUG === "true";
  if (!enabled) return;
  try {
    const fs = require("fs");
    const path = require("path");
    const line = `${new Date().toISOString()} ${tag} ${JSON.stringify(payload)}\n`;
    const file = path.join(process.cwd(), "llm-debug.log");
    fs.appendFileSync(file, line, "utf8");
  } catch {
    // no-op
  }
}
