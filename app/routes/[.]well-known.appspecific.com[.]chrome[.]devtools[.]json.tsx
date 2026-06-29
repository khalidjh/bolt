/*
 * Recent Chrome DevTools probes `/.well-known/appspecific/com.chrome.devtools.json` (its
 * "automatic workspace folders" feature) on every page load. Without a matching route the Remix
 * router throws "No route matches URL" and logs a stack trace each refresh. This resource route
 * answers the probe with an empty 204 so the dev console stays quiet. We don't expose a workspace,
 * so there is no body to return.
 */
export function loader() {
  return new Response(null, { status: 204 });
}
