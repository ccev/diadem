/** Paths that live on the Diadem instance and must be redirected there on native. */
const INSTANCE_PREFIXES = ["/api/", "/assets/"];

/**
 * Decide whether a request URL should be redirected to the remote instance.
 * Returns the rewritten absolute URL, or null to leave the request untouched.
 *
 * @param requestUrl outgoing request URL — absolute, OR a root-relative path
 *   like "/api/config" (SvelteKit's load fetch strips the origin for
 *   same-origin requests, so the wrapper sees relative paths here)
 * @param instanceUrl normalized instance origin ("" = none configured)
 * @param localOrigin the webview's own origin (requests to this origin are candidates)
 */
export function rewriteInstanceUrl(
	requestUrl: string,
	instanceUrl: string,
	localOrigin: string
): string | null {
	if (!instanceUrl) return null;

	let parsed: URL;
	try {
		// Resolve relative paths against the webview origin so "/api/config"
		// becomes "<localOrigin>/api/config" rather than throwing.
		parsed = new URL(requestUrl, localOrigin);
	} catch {
		return null;
	}

	// Already absolute instance URLs (e.g. UICONS image URLs built with the
	// instance base) must still go through CapacitorHttp — both for the native
	// cookie jar/bearer and so maplibre's loadImage gets a CORS-clean Response.
	let instanceOrigin: string;
	try {
		instanceOrigin = new URL(instanceUrl).origin;
	} catch {
		return null;
	}
	if (parsed.origin === instanceOrigin) return parsed.href;

	// Local-origin /api and /assets paths → rewrite to the instance.
	if (parsed.origin !== localOrigin) return null;

	const matches = INSTANCE_PREFIXES.some(
		(p) => parsed.pathname === p.slice(0, -1) || parsed.pathname.startsWith(p)
	);
	if (!matches) return null;

	return `${instanceUrl}${parsed.pathname}${parsed.search}`;
}
