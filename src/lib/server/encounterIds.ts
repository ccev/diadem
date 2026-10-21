import { getServerConfig } from "@/lib/services/config/config.server";
import { TTLCache } from "@isaacs/ttlcache";
import { aessiv } from "@noble/ciphers/aes.js";
import { hkdfSync } from "node:crypto";

const config = getServerConfig().encounterIdObfuscation;
const context = Buffer.from("diadem:encounter-id:v1");
const prefix = "pid_";
let key: Uint8Array | undefined;

if (config?.enabled) {
	if (
		typeof config.secret !== "string" ||
		config.secret.length !== 64 ||
		!/^[0-9a-fA-F]{64}$/.test(config.secret)
	) {
		throw new Error(
			"server.encounterIdObfuscation.secret must be a random 32-byte key encoded as 64 hex characters (generate with: openssl rand -hex 32)"
		);
	}
	// AES-256-SIV uses two 256-bit keys. Derive a dedicated pair from the configured master key.
	key = new Uint8Array(hkdfSync("sha256", Buffer.from(config.secret, "hex"), "", context, 64));
}

const encodedIds = config?.enabled
	? new TTLCache<string, string>({
			max: 1_000_000,
			ttl: 60 * 60 * 1000,
			checkAgeOnGet: true
		})
	: undefined;

/** Stable, authenticated tokens for map keys and shared links, without a nonce or persistent mapping. */
export function encodeEncounterId(id: string): string {
	if (!key) return id;
	const cached = encodedIds?.get(id);
	if (cached !== undefined) return cached;

	if (!/^(0|[1-9][0-9]{0,19})$/.test(id) || id.trim() !== id || BigInt(id) > 0xffffffffffffffffn) {
		throw new Error("Invalid encounter ID from Golbat");
	}

	// Keep all 64 bits; converting encounter IDs through Number would lose precision.
	const plaintext = Buffer.alloc(8);
	plaintext.writeBigUInt64BE(BigInt(id));
	const encrypted = aessiv(key, context).encrypt(plaintext);
	const token = prefix + Buffer.from(encrypted).toString("base64url");
	encodedIds?.set(id, token);
	return token;
}

/** Reject raw IDs and invalid tokens while enabled, before they reach Golbat. */
export function decodeEncounterId(id: string): string | undefined {
	if (!key) return id;
	if (id.length !== 36 || !/^pid_[A-Za-z0-9_-]{32}$/.test(id)) return undefined;

	try {
		const encrypted = Buffer.from(id.slice(prefix.length), "base64url");
		const plaintext = aessiv(key, context).decrypt(encrypted);
		return Buffer.from(plaintext).readBigUInt64BE().toString();
	} catch {
		return undefined;
	}
}
