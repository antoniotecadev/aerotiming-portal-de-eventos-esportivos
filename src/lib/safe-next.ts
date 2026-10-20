/**
 * Só aceita caminhos internos para redireccionar depois do login (12.4, M2).
 * Recusa "//site", "/\site", espaços e tudo o que, resolvido, saia da origem do próprio site.
 */
export function safeNext(next: unknown): string | null {
  if (typeof next !== "string" || !next.startsWith("/") || /^\/[/\\]/.test(next) || /[\\\s]/.test(next)) return null;
  try {
    const base = "http://local.invalid";
    const url = new URL(next, base);
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}
