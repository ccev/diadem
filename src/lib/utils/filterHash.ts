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
 * cyrb53 — a fast, non-cryptographic 53-bit hash. A collision only costs one
 * extra round trip.
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
