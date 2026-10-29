import { aessiv } from "@noble/ciphers/aes.js";
import { createCipheriv, createDecipheriv, hkdfSync } from "node:crypto";

const context = Buffer.from("diadem:encounter-id:v2");
const legacyContext = Buffer.from("diadem:encounter-id:v1");
// RFC 5649's fixed alternative IV; the cipher appends and verifies the plaintext length.
const wrapIv = Buffer.from("a65959a6", "hex");
const prefix = "pid_";

/** @param {string | undefined} secret */
export function deriveEncounterIdKeys(secret) {
	if (typeof secret !== "string" || secret.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(secret)) {
		throw new Error(
			"server.encounterIdObfuscation.secret must be a random 32-byte key encoded as 64 hex characters (generate with: openssl rand -hex 32)"
		);
	}
	const masterKey = Buffer.from(secret, "hex");
	return {
		key: new Uint8Array(hkdfSync("sha256", masterKey, "", context, 32)),
		// Keep previously shared AES-256-SIV tokens readable under their original key.
		legacyKey: new Uint8Array(hkdfSync("sha256", masterKey, "", legacyContext, 64))
	};
}

/**
 * @param {string} id
 * @param {Uint8Array} key
 */
export function encryptEncounterId(id, key) {
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
	return prefix + encrypted.toString("base64url");
}

/**
 * @param {string} token
 * @param {Uint8Array} key
 * @param {Uint8Array} legacyKey
 */
export function decryptEncounterId(token, key, legacyKey) {
	if (
		(token.length !== 26 && token.length !== 36) ||
		!/^pid_(?:[A-Za-z0-9_-]{22}|[A-Za-z0-9_-]{32})$/.test(token)
	)
		return undefined;
	try {
		const payload = token.slice(prefix.length);
		const encrypted = Buffer.from(payload, "base64url");
		// Reject alternate encodings with nonzero unused base64 bits.
		if (encrypted.toString("base64url") !== payload) return undefined;
		let plaintext;
		if (encrypted.length === 24) {
			plaintext = Buffer.from(aessiv(legacyKey, legacyContext).decrypt(encrypted));
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
