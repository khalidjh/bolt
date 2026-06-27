import type { LoaderFunction } from '@remix-run/cloudflare';
import { getConfiguredOperatorServices } from '~/lib/.server/operatorTokens';

/**
 * Reports which integrations the operator has configured a server-side default
 * token for. Returns only booleans — never the tokens themselves — so the
 * client can show a "hosted by default" state without ever seeing the secret.
 */
export const loader: LoaderFunction = async ({ context }) => {
  return Response.json(getConfiguredOperatorServices(context));
};
