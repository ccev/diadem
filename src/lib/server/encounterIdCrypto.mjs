import { aessiv } from "@noble/ciphers/aes.js";
import { hkdfSync } from "node:crypto";

const context = Buffer.from("diadem:encounter-id:v1");
const prefix = "pid_";

/** @param {string | undefined} secret */
export function deriveEncounterIdKey(secret) {
	if (typeof secret !== "string" || secret.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(secret)) {
		throw new Error(
			"server.encounterIdObfuscation.secret must be a random 32-byte key encoded as 64 hex characters (generate with: openssl rand -hex 32)"
		);
	}
	// AES-256-SIV uses two 256-bit keys. Keep the existing derivation and token format.
	return new Uint8Array(hkdfSync("sha256", Buffer.from(secret, "hex"), "", context, 64));
}

/**
 * @param {string} id
 * @param {Uint8Array} key
 */
export function encryptEncounterId(id, key) {
	if (!/^(0|[1-9][0-9]{0,19})$/.test(id) || id.trim() !== id || BigInt(id) > 0xffffffffffffffffn) {
		throw new Error("Invalid encounter ID from Golbat");
	}
	// Keep all 64 bits; converting encounter IDs through Number would lose precision.
	const plaintext = Buffer.alloc(8);
	plaintext.writeBigUInt64BE(BigInt(id));
	return prefix + Buffer.from(aessiv(key, context).encrypt(plaintext)).toString("base64url");
}

/**
 * @param {string} token
 * @param {Uint8Array} key
 */
export function decryptEncounterId(token, key) {
	if (token.length !== 36 || !/^pid_[A-Za-z0-9_-]{32}$/.test(token)) return undefined;
	try {
		const encrypted = Buffer.from(token.slice(prefix.length), "base64url");
		const plaintext = aessiv(key, context).decrypt(encrypted);
		return Buffer.from(plaintext).readBigUInt64BE().toString();
	} catch {
		return undefined;
	}
}
