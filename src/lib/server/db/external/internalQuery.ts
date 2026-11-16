import { getServerConfig } from "@/lib/services/config/config.server";
import { getDbUri } from "@/lib/services/config/dbUri.server";
import { getLogger } from "@/lib/utils/logger";
import { error } from "@sveltejs/kit";
import mysql from "mysql2/promise";
import { readLoadSchema } from "@/lib/services/config/readLoadConfig";
import { ReadBudget, ReadUnavailable } from "./readBudget";
import { deadlineRead, detectReadDialect, type ReadDialect } from "./readDeadline";

const log = getLogger("query");

const tuning = readLoadSchema.parse(getServerConfig().readLoad ?? {});
const connection = mysql.createPool({
	uri: getDbUri(getServerConfig().db),
	connectionLimit: tuning.concurrency,
	waitForConnections: false,
	connectTimeout: Math.min(tuning.statementTimeoutMs, 5000)
});
const budget = new ReadBudget(tuning.concurrency, tuning.queueLimit, tuning.queueTimeoutMs);
let dialect: ReadDialect | undefined = tuning.deadline === "auto" ? undefined : tuning.deadline;

async function read(options: mysql.QueryOptions, values?: unknown[], maxTimeoutMs?: number) {
	if (maxTimeoutMs !== undefined && (!Number.isSafeInteger(maxTimeoutMs) || maxTimeoutMs < 100))
		throw new ReadUnavailable("Invalid read deadline");
	const timeoutMs = Math.min(tuning.statementTimeoutMs, maxTimeoutMs ?? tuning.statementTimeoutMs);
	return budget.run(async () => {
		const conn = await connection.getConnection();
		let destroyed = false;
		// Transport watchdog only; deadlineRead installs the actual server-side deadline.
		let timer: NodeJS.Timeout | undefined;
		try {
			return await Promise.race([
				(async () => {
					if (!dialect) {
						const [rows] = await conn.query<mysql.RowDataPacket[]>("SELECT VERSION() AS version");
						dialect = detectReadDialect(rows[0]?.version ?? "");
					}
					const [result] = await deadlineRead(conn, options, values, dialect, timeoutMs);
					return result;
				})(),
				new Promise<never>((_, reject) => {
					timer = setTimeout(() => {
						destroyed = true;
						conn.destroy();
						reject(new ReadUnavailable("Read transport timeout"));
					}, timeoutMs + 1000);
				})
			]);
		} finally {
			clearTimeout(timer);
			if (!destroyed) conn.release();
		}
	});
}

function sqlError(cause: unknown): never {
	log.error("SQL exception", cause);
	const code = (cause as { code?: string })?.code;
	if (
		cause instanceof ReadUnavailable ||
		(cause as { errno?: number })?.errno === 1969 ||
		[
			"ER_QUERY_TIMEOUT",
			"ER_STATEMENT_TIMEOUT",
			"ER_QUERY_INTERRUPTED",
			"ETIMEDOUT",
			"ECONNREFUSED",
			"PROTOCOL_CONNECTION_LOST",
			"ER_CON_COUNT_ERROR"
		].includes(code ?? "")
	)
		error(503, "Read service temporarily unavailable");
	error(500);
}

export async function query<T>(sql: string, values?: unknown[], maxTimeoutMs?: number): Promise<T> {
	const start = performance.now();

	try {
		const result = await read({ sql }, values, maxTimeoutMs);
		log.debug(`Query took %fms: %s`, (performance.now() - start).toFixed(1), sql);
		return result as T;
	} catch (e) {
		sqlError(e);
	}
}

export async function queryJoined<T>(sql: string, values?: unknown[]): Promise<T> {
	const start = performance.now();

	let rows: mysql.QueryResult;
	try {
		const result = await read({ sql, nestTables: true }, values);
		rows = result;
	} catch (e) {
		sqlError(e);
	}

	const parsed: any[] = [];
	if (rows) {
		for (const row of rows as Record<string, any>[]) {
			const keys = Object.keys(row);
			if (!keys.length) continue;

			const mainRow = row[keys[0]];
			const subRows: Record<string, any[]> = {};
			for (const key of keys.slice(1)) {
				subRows[key] = [row[key]];
			}

			const last = parsed[parsed.length - 1];
			if (last && last.id && last.id === mainRow.id) {
				for (const key of Object.keys(subRows)) {
					if (!last[key]) last[key] = [];
					last[key] = [...last[key], subRows[key][0]];
				}
			} else {
				parsed.push({ ...mainRow, ...subRows });
			}
		}
	}

	log.debug(`Query took %fms: %s`, (performance.now() - start).toFixed(1), sql);
	return parsed as T;
}
