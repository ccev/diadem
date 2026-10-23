import { getServerConfig } from "@/lib/services/config/config.server";
import { TTLCache } from "@isaacs/ttlcache";
import { aessiv } from "@noble/ciphers/aes.js";
import { createCipheriv, createDecipheriv, hkdfSync } from "node:crypto";

const config = getServerConfig().encounterIdObfuscation;
const context = Buffer.from("diadem:encounter-id:v2");
const legacyContext = Buffer.from("diadem:encounter-id:v1");
// RFC 5649's fixed alternative IV; the cipher appends and verifies the plaintext length.
const wrapIv = Buffer.from("a65959a6", "hex");
const prefix = "pid_";
let key: Uint8Array | undefined;
let legacyKey: Uint8Array | undefined;

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
	const masterKey = Buffer.from(config.secret, "hex");
	key = new Uint8Array(hkdfSync("sha256", masterKey, "", context, 32));
	// Retain decoding of previously shared AES-256-SIV tokens under their original key.
	legacyKey = new Uint8Array(hkdfSync("sha256", masterKey, "", legacyContext, 64));
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

	if (!/^(0|[1-9][0-9]{0,19})$/.test(id) || id.trim() !== id) {
		throw new Error("Invalid encounter ID from Golbat");
	}
	const encounterId = BigInt(id);
	if (encounterId > 0xffffffffffffffffn) {
		throw new Error("Invalid encounter ID from Golbat");
	}

	// Keep all 64 bits; converting encounter IDs through Number would lose precision.
	const plaintext = Buffer.alloc(8);
	plaintext.writeBigUInt64BE(encounterId);
	// An 8-byte ID wraps to one AES block (16 bytes), including the integrity check.
	const cipher = createCipheriv("id-aes256-wrap-pad", key, wrapIv);
	const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const token = prefix + encrypted.toString("base64url");
	encodedIds?.set(id, token);
	return token;
}

/** Reject raw IDs and invalid tokens while enabled, before they reach Golbat. */
export function decodeEncounterId(id: string): string | undefined {
	if (!key) return id;
	if (
		(id.length !== 26 && id.length !== 36) ||
		!/^pid_(?:[A-Za-z0-9_-]{22}|[A-Za-z0-9_-]{32})$/.test(id)
	)
		return undefined;

	try {
		const payload = id.slice(prefix.length);
		const encrypted = Buffer.from(payload, "base64url");
		// Reject alternate encodings with nonzero unused base64 bits.
		if (encrypted.toString("base64url") !== payload) return undefined;
		let plaintext: Buffer;
		if (encrypted.length === 24) {
			plaintext = Buffer.from(aessiv(legacyKey!, legacyContext).decrypt(encrypted));
		} else {
			const cipher = createDecipheriv("id-aes256-wrap-pad", key, wrapIv);
			plaintext = Buffer.concat([cipher.update(encrypted), cipher.final()]);
		}
		// KWP also accepts shorter payloads. Only the exact uint64 format is valid here.
		if (plaintext.length !== 8) return undefined;
		return plaintext.readBigUInt64BE().toString();
	} catch {
		return undefined;
	}
}
