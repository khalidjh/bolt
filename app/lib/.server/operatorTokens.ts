/**
 * Server-only resolver for the operator's PaaS tokens.
 *
 * These tokens let the operator host every client's project on their OWN
 * Netlify / Supabase / GitHub accounts by default. They are read exclusively
 * from server-side environment variables and MUST NOT use the `VITE_` prefix
 * in a PaaS deployment, otherwise Vite would bundle them into the browser and
 * expose them to clients. The legacy `VITE_*` names are still accepted as a
 * fallback for existing single-user setups.
 *
 * Precedence for any individual request is handled by the caller:
 *   user's own token (opt-in override) -> operator token (these) -> error.
 */
export type OperatorService = 'netlify' | 'supabase' | 'github';

const OPERATOR_ENV_VARS: Record<OperatorService, string[]> = {
  netlify: ['NETLIFY_AUTH_TOKEN', 'VITE_NETLIFY_ACCESS_TOKEN'],
  supabase: ['SUPABASE_ACCESS_TOKEN', 'VITE_SUPABASE_ACCESS_TOKEN'],
  github: ['GITHUB_TOKEN', 'VITE_GITHUB_ACCESS_TOKEN'],
};

type EnvContext = { cloudflare?: { env?: Record<string, string | undefined> } } | undefined;

export function getOperatorToken(service: OperatorService, context?: EnvContext): string | undefined {
  const cloudflareEnv = context?.cloudflare?.env ?? {};

  for (const name of OPERATOR_ENV_VARS[service]) {
    const value = cloudflareEnv[name] || process.env[name];

    if (value) {
      return value;
    }
  }

  return undefined;
}

export function getConfiguredOperatorServices(context?: EnvContext): Record<OperatorService, boolean> {
  return {
    netlify: !!getOperatorToken('netlify', context),
    supabase: !!getOperatorToken('supabase', context),
    github: !!getOperatorToken('github', context),
  };
}
