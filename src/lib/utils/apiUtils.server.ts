
const defaultCacheAge = 86400 * 120 // 120 days

export function cacheHttpHeaders(age: number = defaultCacheAge) {
	return {
		"Cache-Control": `public, max-age=${age}`
	}
}