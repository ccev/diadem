import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { and, eq, like, lte } from "drizzle-orm";
import { db } from "@/lib/server/db/internal";
import { verification } from "@/lib/server/db/internal/schema";

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
 * The shared verification table makes codes available across cluster workers
 * and server restarts. Consumption locks and deletes the row atomically, so a
 * code can only be exchanged once even when requests reach different workers.
 */
const TTL_MS = 2 * 60 * 1000;
const CODE_PREFIX = "native-handoff:";

/** Issue a one-time code for `token`, bound to the PKCE `challenge`. */
export async function issueNativeCode(token: string, challenge: string): Promise<string> {
	const now = Date.now();
	const code = randomBytes(32).toString("base64url");
	await db
		.delete(verification)
		.where(
			and(
				like(verification.identifier, `${CODE_PREFIX}%`),
				lte(verification.expiresAt, new Date(now))
			)
		);
	await db.insert(verification).values({
		id: randomBytes(16).toString("hex"),
		identifier: `${CODE_PREFIX}${code}`,
		value: JSON.stringify({ token, challenge }),
		expiresAt: new Date(now + TTL_MS),
		createdAt: new Date(now),
		updatedAt: new Date(now)
	});
	return code;
}

/**
 * Consume a code: returns the token only if the code exists, hasn't expired,
 * and `verifier` hashes to the bound challenge. The code is removed on any
 * attempt (single-use), so a failed/replayed exchange can't be retried.
 */
export async function consumeNativeCode(code: string, verifier: string): Promise<string | null> {
	if (!/^[\w-]{43}$/.test(code) || !/^[\w.~-]{43,128}$/.test(verifier)) return null;
	return db.transaction(async (tx) => {
		const [row] = await tx
			.select()
			.from(verification)
			.where(eq(verification.identifier, `${CODE_PREFIX}${code}`))
			.limit(1)
			.for("update");
		if (!row) return null;
		await tx.delete(verification).where(eq(verification.id, row.id));
		if (row.expiresAt.getTime() <= Date.now()) return null;

		try {
			const entry: { token?: unknown; challenge?: unknown } = JSON.parse(row.value);
			if (typeof entry.token !== "string" || typeof entry.challenge !== "string") return null;
			// challenge === base64url(sha256(verifier)), compared in constant time.
			const expected = createHash("sha256").update(verifier).digest();
			const provided = Buffer.from(entry.challenge, "base64url");
			if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
			return entry.token || null;
		} catch {
			return null;
		}
	});
}
