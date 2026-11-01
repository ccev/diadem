import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql, { type Connection, type Pool } from "mysql2/promise";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { verification } from "@/lib/server/db/internal/schema";

const uri = process.env.NATIVE_HANDOFF_TEST_DATABASE_URL;
const verifier = "native-verifier-".padEnd(43, "x");
const challenge = createHash("sha256").update(verifier).digest("base64url");

describe.skipIf(!uri)("native login handoff (MySQL)", () => {
	const database = `diadem_handoff_test_${randomBytes(8).toString("hex")}`;
	const pools: Pool[] = [];
	let admin: Connection | undefined;
	let db: MySql2Database;
	let issuer: typeof import("./nativeHandoff");
	let otherWorker: typeof import("./nativeHandoff");

	beforeAll(async () => {
		admin = await mysql.createConnection(uri!);
		await admin.query(`CREATE DATABASE \`${database}\``);
		for (let i = 0; i < 2; i++) {
			pools.push(mysql.createPool({ uri, database, timezone: "Z", connectionLimit: 1 }));
		}
		db = drizzle(pools[0]);
		// Use the production table definition and indexes from the migration.
		const migration = await readFile("drizzle/0001_majestic_bucky.sql", "utf8");
		for (const statement of migration.split("--> statement-breakpoint")) {
			if (statement.includes("`verification`")) await pools[0].query(statement);
		}

		vi.doMock("@/lib/server/db/internal", () => ({ db }));
		issuer = await import("./nativeHandoff");
		vi.resetModules();
		const otherDb = drizzle(pools[1]);
		vi.doMock("@/lib/server/db/internal", () => ({ db: otherDb }));
		otherWorker = await import("./nativeHandoff");
	});

	beforeEach(async () => {
		await db.delete(verification);
	});

	afterAll(async () => {
		vi.doUnmock("@/lib/server/db/internal");
		await Promise.all(pools.map((pool) => pool.end()));
		if (admin) {
			try {
				await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
			} finally {
				await admin.end();
			}
		}
	});

	it("exchanges a code through a separately loaded module and database connection", async () => {
		expect(issuer.consumeNativeCode).not.toBe(otherWorker.consumeNativeCode);
		const code = await issuer.issueNativeCode("session-token", challenge);
		expect(await otherWorker.consumeNativeCode(code, verifier)).toBe("session-token");
		expect(await issuer.consumeNativeCode(code, verifier)).toBeNull();
	});

	it("allows exactly one concurrent exchange across connections", async () => {
		const code = await issuer.issueNativeCode("session-token", challenge);
		const results = await Promise.all([
			issuer.consumeNativeCode(code, verifier),
			otherWorker.consumeNativeCode(code, verifier)
		]);
		expect(results).toHaveLength(2);
		expect(results).toContain("session-token");
		expect(results).toContain(null);
		expect(await db.select().from(verification)).toEqual([]);
	});

	it("consumes a handoff even when the verifier does not match", async () => {
		const code = await issuer.issueNativeCode("session-token", challenge);
		expect(await otherWorker.consumeNativeCode(code, "wrong".padEnd(43, "x"))).toBeNull();
		expect(await issuer.consumeNativeCode(code, verifier)).toBeNull();
	});

	it("rejects and cleans up expired handoffs while keeping other verification records", async () => {
		const expired = await issuer.issueNativeCode("expired-token", challenge);
		await issuer.issueNativeCode("another-expired-token", challenge);
		await db.update(verification).set({ expiresAt: new Date(0) });
		await db.insert(verification).values({
			id: "other",
			identifier: "other-provider",
			value: "unrelated-verification",
			expiresAt: new Date(0),
			createdAt: new Date(0),
			updatedAt: new Date(0)
		});
		expect(await otherWorker.consumeNativeCode(expired, verifier)).toBeNull();
		const active = await issuer.issueNativeCode("active-token", challenge);
		const rows = await db.select().from(verification);
		expect(rows.map((row) => row.identifier).sort()).toEqual([
			`native-handoff:${active}`,
			"other-provider"
		]);
		expect(await otherWorker.consumeNativeCode(active, verifier)).toBe("active-token");
	});
});
