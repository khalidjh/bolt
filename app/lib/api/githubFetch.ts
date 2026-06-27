/**
 * Fetch a GitHub REST API URL, using the provided token for higher rate limits
 * (and private access) when available.
 *
 * Many of our GitHub calls target *public* resources (template repos, public repo
 * metadata/branches, repo search). When the configured token is invalid or expired
 * GitHub responds with 401, which would otherwise bubble up as a 500. Since those
 * resources are reachable anonymously, transparently retry without authentication on
 * a 401 instead of failing the whole request.
 *
 * Do NOT use this for user-scoped endpoints (`/user`, `/user/repos`): those require a
 * valid token and an anonymous retry is meaningless — call `fetch` directly there so a
 * bad token surfaces as a clean 401.
 */
export async function githubApiFetch(
  input: string,
  githubToken?: string,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  const baseHeaders: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'etlaq-app',
    ...extraHeaders,
  };

  if (githubToken) {
    const authed = await fetch(input, { headers: { ...baseHeaders, Authorization: `Bearer ${githubToken}` } });

    // A bad/expired token returns 401 — fall back to an anonymous request rather than erroring out.
    if (authed.status !== 401) {
      return authed;
    }

    console.warn(`GitHub token rejected (401) for ${input} — retrying without authentication`);
  }

  return fetch(input, { headers: baseHeaders });
}
