/**
 * Stable hashing of filter objects, used to avoid re-uploading the full filter
 * JSON on every map object poll. The client sends only the hash; the server
 * looks up the filter it last saw for that user + map object type and asks for
 * a full resend (HTTP 409) when the hash doesn't match.
 */

/**
 * JSON.stringify with deterministic key order, so two structurally equal
 * filters always produce the same string regardless of insertion order.
 *
 * Null, undefined and non-finite properties are all dropped. Undefined matches
 * JSON.stringify; null is dropped because msgpack has no undefined, so a field
 * the client left unset arrives as null and the server strips it — hashing it
 * here would describe a filter the server never stores.
 *
 * Infinity gets the same treatment for the same reason: JSON has no way to
 * write it, so a filter carrying one (an open-ended quest range, say) reaches
 * the server as null over JSON and as a real infinity over msgpack. Ignoring it
 * on both sides is what keeps the two hashes equal.
 */
function isHashable(value: unknown): boolean {
	if (value === undefined || value === null) return false;
	return typeof value !== "number" || Number.isFinite(value);
}

export function stableStringify(value: unknown): string {
	if (value === null || typeof value !== "object") {
		return isHashable(value) ? (JSON.stringify(value) ?? "null") : "null";
	}

	if (Array.isArray(value)) {
		return "[" + value.map((item) => stableStringify(item)).join(",") + "]";
	}

	const record = value as Record<string, unknown>;
	const parts: string[] = [];
	for (const key of Object.keys(record).sort()) {
		const entry = record[key];
		if (!isHashable(entry)) continue;
		parts.push(JSON.stringify(key) + ":" + stableStringify(entry));
	}
	return "{" + parts.join(",") + "}";
}

/**
 * cyrb53 — a fast, non-cryptographic 53-bit hash. Collisions only matter within
 * a single user's cache entry for one map object type, where a mismatch merely
 * costs one extra round trip, so 53 bits is far more than enough.
 */
function cyrb53(str: string): number {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Stable hash of a filter object. Returns undefined when there is no filter. */
export function getFilterHash(filter: unknown): string | undefined {
	if (filter === undefined || filter === null) return undefined;
	return cyrb53(stableStringify(filter)).toString(36);
}
