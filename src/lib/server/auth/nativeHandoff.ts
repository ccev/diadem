import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

/**
 * Short-lived, single-use handoff codes for native (Capacitor) login.
 *
 * Instead of putting the raw session token in the `diadem://auth` deep link
 * (where a co-installed app registered for the scheme, OS logs, or browser
 * history could capture it), the callback issues a random CODE bound to a PKCE
 * challenge. The app exchanges that code — plus the matching verifier it kept
 * privately — for the token over HTTPS. The code is useless without the
 * verifier, so intercepting the deep link alone grants nothing.
 *
 * In-memory by design: codes live for ~2 minutes between the browser redirect
 * and the app's exchange call, and the server is a single adapter-node process.
 */
type Entry = { token: string; challenge: string; expiresAt: number };

const codes = new Map<string, Entry>();
const TTL_MS = 2 * 60 * 1000;

function sweep(now: number): void {
	for (const [code, entry] of codes) {
		if (entry.expiresAt <= now) codes.delete(code);
	}
}

/** Issue a one-time code for `token`, bound to the PKCE `challenge`. */
export function issueNativeCode(token: string, challenge: string): string {
	const now = Date.now();
	sweep(now);
	const code = randomBytes(32).toString("base64url");
	codes.set(code, { token, challenge, expiresAt: now + TTL_MS });
	return code;
}

/**
 * Consume a code: returns the token only if the code exists, hasn't expired,
 * and `verifier` hashes to the bound challenge. The code is removed on any
 * attempt (single-use), so a failed/replayed exchange can't be retried.
 */
export function consumeNativeCode(code: string, verifier: string): string | null {
	const now = Date.now();
	sweep(now);

	const entry = codes.get(code);
	if (!entry) return null;
	codes.delete(code);
	if (entry.expiresAt <= now) return null;

	// challenge === base64url(sha256(verifier)), compared in constant time.
	const expected = createHash("sha256").update(verifier).digest();
	let provided: Buffer;
	try {
		provided = Buffer.from(entry.challenge, "base64url");
	} catch {
		return null;
	}
	if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

	return entry.token;
}
