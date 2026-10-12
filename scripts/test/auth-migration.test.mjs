import { afterAll, describe, expect, it } from "vitest";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import mysql from "mysql2/promise";

// Opt-in integration check. Creates ONLY a disposable, socket-only MariaDB;
// --no-defaults prevents reading local credentials or connecting to an existing DB.
describe.skipIf(process.env.DIADEM_MIGRATION_TEST !== "1")("auth database migration", () => {
	let server;
	let connection;
	let directory;
	let socketDirectory;
	afterAll(async () => {
		await connection?.end();
		if (server && server.exitCode === null) {
			await new Promise((done) => {
				server.once("exit", done);
				server.kill("SIGTERM");
			});
		}
		if (directory) await rm(directory, { recursive: true, force: true });
		if (socketDirectory) await rm(socketDirectory, { recursive: true, force: true });
	});
	it("retains legacy users/settings/accounts/sessions and permits multiple Telegram-only users", async () => {
		await mkdir("node_modules/.cache", { recursive: true });
		directory = await mkdtemp(resolve("node_modules/.cache/diadem-migration-"));
		socketDirectory = await mkdtemp(join(tmpdir(), "diadem-migration-"));
		const socket = join(socketDirectory, "mysql.sock");
		execFileSync(
			"mariadb-install-db",
			[
				"--no-defaults",
				`--datadir=${directory}`,
				"--auth-root-authentication-method=normal",
				"--skip-test-db"
			],
			{ stdio: "ignore" }
		);
		server = spawn(
			"mariadbd",
			[
				"--no-defaults",
				`--datadir=${directory}`,
				`--socket=${socket}`,
				`--pid-file=${join(directory, "mysql.pid")}`,
				"--skip-networking",
				...(process.getuid?.() === 0 ? ["--user=root"] : [])
			],
			{ stdio: "ignore" }
		);
		for (let attempt = 0; attempt < 100; attempt++) {
			try {
				connection = await mysql.createConnection({ socketPath: socket, user: "root" });
				break;
			} catch {
				await new Promise((done) => setTimeout(done, 100));
			}
		}
		if (!connection) throw new Error("Disposable MariaDB did not start");
		await connection.query("CREATE DATABASE diadem_migration");
		await connection.query("USE diadem_migration");
		const migrate = async (file) => {
			for (const statement of (await readFile(`drizzle/${file}`, "utf8")).split(
				"--> statement-breakpoint"
			)) {
				if (statement.trim()) await connection.query(statement);
			}
		};
		await migrate("0000_fixed_madrox.sql");
		await connection.query(
			"INSERT INTO user (id, discord_id, permissions, user_settings) VALUES ('legacy', '123', '{}', '{\"theme\":\"dark\"}')"
		);
		await migrate("0001_majestic_bucky.sql");
		await connection.query(
			"INSERT INTO account (id, account_id, provider_id, user_id, created_at, updated_at) VALUES ('discord-account', '123', 'discord', 'legacy', NOW(), NOW())"
		);
		await connection.query(
			"INSERT INTO session (id, user_id, expires_at, token, created_at, updated_at) VALUES ('session', 'legacy', DATE_ADD(NOW(), INTERVAL 1 DAY), 'legacy-token', NOW(), NOW())"
		);
		const [beforeUsers] = await connection.query("SELECT * FROM user");
		const [beforeAccounts] = await connection.query("SELECT * FROM account");
		const [beforeSessions] = await connection.query("SELECT * FROM session");
		await migrate("0002_telegram_accounts.sql");
		expect((await connection.query("SELECT * FROM user"))[0]).toEqual(beforeUsers);
		expect((await connection.query("SELECT * FROM account"))[0]).toEqual(beforeAccounts);
		expect((await connection.query("SELECT * FROM session"))[0]).toEqual(beforeSessions);
		for (const id of ["456", "789"]) {
			await connection.query(
				"INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, 'Telegram', ?, false, NOW(), NOW())",
				[id, `${id}@telegram.invalid`]
			);
			await connection.query(
				"INSERT INTO account (id, account_id, provider_id, user_id, created_at, updated_at) VALUES (?, ?, 'telegram', ?, NOW(), NOW())",
				[`account-${id}`, id, id]
			);
		}
		expect((await connection.query("SELECT * FROM user WHERE discord_id IS NULL"))[0]).toHaveLength(
			2
		);
		await expect(
			connection.query(
				"INSERT INTO account (id, account_id, provider_id, user_id, created_at, updated_at) VALUES ('conflict', '456', 'telegram', 'legacy', NOW(), NOW())"
			)
		).rejects.toMatchObject({ code: "ER_DUP_ENTRY" });
	}, 120000);
});
