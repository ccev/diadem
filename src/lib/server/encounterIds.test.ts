import type { ServerConfig } from "@/lib/services/config/configTypes";
import { beforeEach, describe, expect, it, vi } from "vitest";

const config = vi.hoisted(() => ({
	encounterIdObfuscation: undefined as ServerConfig["encounterIdObfuscation"]
}));
vi.mock("@/lib/services/config/config.server", () => ({ getServerConfig: () => config }));

const secret = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";

beforeEach(() => {
	vi.resetModules();
	config.encounterIdObfuscation = { enabled: true, secret };
});

describe("encounter ID encryption", () => {
	it.each(["0", "1", "9007199254740991", "9007199254740993", "18446744073709551615"])(
		"round-trips uint64 ID %s without losing precision",
		async (id) => {
			const { encodeEncounterId, decodeEncounterId } = await import("./encounterIds");
			const token = encodeEncounterId(id);
			expect(token).toMatch(/^enc1_[A-Za-z0-9_-]{32}$/);
			expect(token).not.toBe(id);
			expect(decodeEncounterId(token)).toBe(id);
		}
	);

	it("keeps tokens stable across calls and server instances using the same key", async () => {
		const first = await import("./encounterIds");
		const token = first.encodeEncounterId("18446744073709551615");
		expect(first.encodeEncounterId("18446744073709551615")).toBe(token);
		expect(first.encodeEncounterId("18446744073709551614")).not.toBe(token);

		vi.resetModules();
		const second = await import("./encounterIds");
		expect(second.encodeEncounterId("18446744073709551615")).toBe(token);
		expect(second.decodeEncounterId(token)).toBe("18446744073709551615");
	});

	it("rejects modifications to every byte of the authentication tag and ciphertext", async () => {
		const { encodeEncounterId, decodeEncounterId } = await import("./encounterIds");
		const token = encodeEncounterId("18446744073709551615");
		const encrypted = Buffer.from(token.slice(5), "base64url");
		for (let i = 0; i < encrypted.length; i++) {
			const modified = Buffer.from(encrypted);
			modified[i] ^= 1;
			expect(decodeEncounterId("enc1_" + modified.toString("base64url"))).toBeUndefined();
		}
	});

	it("uses different tokens for a different secret and rejects the old tokens", async () => {
		const first = await import("./encounterIds");
		const token = first.encodeEncounterId("12345678901234567890");
		config.encounterIdObfuscation!.secret = "ab".repeat(32);
		vi.resetModules();
		const second = await import("./encounterIds");
		expect(second.encodeEncounterId("12345678901234567890")).not.toBe(token);
		expect(second.decodeEncounterId(token)).toBeUndefined();
	});

	it("rejects raw IDs, malformed tokens, and unknown versions", async () => {
		const { encodeEncounterId, decodeEncounterId } = await import("./encounterIds");
		const token = encodeEncounterId("12345678901234567890");
		for (const invalid of [
			"",
			"12345678901234567890",
			"enc1_",
			token.replace("enc1_", "enc2_"),
			token.slice(0, -1),
			token + "A",
			token + "=",
			token + "\n",
			"enc1_" + "/".repeat(32),
			"enc1_" + "A".repeat(32)
		]) {
			expect(decodeEncounterId(invalid)).toBeUndefined();
		}
	});

	it.each(["", "-1", "01", "1\n", "1.5", "1e3", "18446744073709551616", "9".repeat(100)])(
		"rejects invalid backend ID %j rather than emitting it",
		async (id) => {
			const { encodeEncounterId } = await import("./encounterIds");
			expect(() => encodeEncounterId(id)).toThrow("Invalid encounter ID from Golbat");
		}
	);

	it.each([
		undefined,
		"",
		"password",
		"a".repeat(63),
		"a".repeat(65),
		"g".repeat(64),
		secret + "\n"
	])("fails closed on startup with an invalid secret (%j)", async (invalid) => {
		config.encounterIdObfuscation!.secret = invalid;
		await expect(import("./encounterIds")).rejects.toThrow(
			"server.encounterIdObfuscation.secret must be a random 32-byte key"
		);
	});

	it.each([undefined, {}, { enabled: false, secret: "invalid" }, { secret }])(
		"preserves the existing ID format when disabled or omitted (%j)",
		async (options) => {
			config.encounterIdObfuscation = options;
			const { encodeEncounterId, decodeEncounterId } = await import("./encounterIds");
			expect(encodeEncounterId("18446744073709551615")).toBe("18446744073709551615");
			expect(decodeEncounterId("18446744073709551615")).toBe("18446744073709551615");
		}
	);
});
