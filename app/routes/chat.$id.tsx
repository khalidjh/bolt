import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { default as IndexRoute } from './_index';
import { buildMeta } from '~/lib/seo';

export async function loader(args: LoaderFunctionArgs) {
  return json({ id: args.params.id });
}

// Individual chats are private workspaces — keep them out of search indexes.
export const meta: MetaFunction = () => buildMeta({ noindex: true });

export default IndexRoute;
