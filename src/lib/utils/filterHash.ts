import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";

export function stableStringify(value: unknown): string {
	return (
		JSON.stringify(value, (_key, entry) => {
			if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
			return Object.fromEntries(
				Object.entries(entry).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
			);
		}) ?? "null"
	);
}

export function getFilterHash(filter: unknown): string | undefined {
	if (filter === undefined || filter === null) return undefined;
	return encodeHexLowerCase(sha256(new TextEncoder().encode(stableStringify(filter))));
}
