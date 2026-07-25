const defaultCacheAge = 86400 * 120; // 120 days

export function cacheHttpHeaders(
	age: number = defaultCacheAge,
	sharedAge: number = age,
	staleWhileRevalidate?: number
) {
	const cacheControl = [`public`, `max-age=${age}`, `s-maxage=${sharedAge}`];
	if (staleWhileRevalidate) cacheControl.push(`stale-while-revalidate=${staleWhileRevalidate}`);

	return {
		"Cache-Control": cacheControl.join(", ")
	};
}

export const noStoreHttpHeaders = {
	"Cache-Control": "private, no-store"
};
