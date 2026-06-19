/** Paths that live on the Diadem instance and must be redirected there on native. */
const INSTANCE_PREFIXES = ["/api/", "/assets/"];

/**
 * Decide whether a request URL should be redirected to the remote instance.
 * Returns the rewritten absolute URL, or null to leave the request untouched.
 *
 * @param requestUrl absolute URL of the outgoing request
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
		parsed = new URL(requestUrl);
	} catch {
		return null;
	}

	// Only rewrite requests aimed at our own webview origin.
	if (parsed.origin !== localOrigin) return null;

	const matches = INSTANCE_PREFIXES.some(
		(p) => parsed.pathname === p.slice(0, -1) || parsed.pathname.startsWith(p)
	);
	if (!matches) return null;

	return `${instanceUrl}${parsed.pathname}${parsed.search}`;
}
