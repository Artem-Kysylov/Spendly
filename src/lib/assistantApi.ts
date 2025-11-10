export function getAssistantApiUrl(locale: string): string {
  const safe = (locale || 'en').trim().replace(/^\//, '')
  return `/${safe}/api/assistant`
}