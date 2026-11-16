import type { PoolConnection, QueryOptions, RowDataPacket } from "mysql2/promise";
import { ReadUnavailable } from "./readBudget";

export type ReadDialect = "mysql" | "mariadb";

export function detectReadDialect(version: string): ReadDialect {
	// MariaDB can prefix its version with the MySQL compatibility version 5.5.5.
	const maria = /(\d+)\.(\d+)\.(\d+)-MariaDB/i.exec(version);
	const match = maria ?? /^(\d+)\.(\d+)\.(\d+)/.exec(version);
	if (!match) throw new ReadUnavailable("Unrecognized database version");
	const [, major, minor, patch] = match.map(Number);
	const numeric = major * 10000 + minor * 100 + patch;
	if (maria ? numeric < 100102 : numeric < 50708)
		throw new ReadUnavailable("Database does not support read statement deadlines");
	return maria ? "mariadb" : "mysql";
}

/** Real server deadlines, used only on the dedicated external read pool. */
export async function deadlineRead(
	connection: PoolConnection,
	options: QueryOptions,
	values: unknown[] | undefined,
	dialect: ReadDialect,
	timeoutMs: number
) {
	if (dialect === "mariadb") {
		return connection.query(
			{
				...options,
				sql: `SET STATEMENT max_statement_time=${timeoutMs / 1000} FOR ${options.sql}`
			},
			values
		);
	}
	// Session scope covers CTEs and UNIONs without rewriting SQL or relying on hints.
	// Preserve a stricter inherited deadline and restore the exact session state.
	const [rows] = await connection.query<RowDataPacket[]>(
		"SELECT @@SESSION.max_execution_time AS deadline"
	);
	const previous = Number(rows[0]?.deadline);
	if (!Number.isSafeInteger(previous) || previous < 0)
		throw new ReadUnavailable("Invalid MySQL session deadline");
	const deadline = previous > 0 ? Math.min(previous, timeoutMs) : timeoutMs;
	try {
		await connection.query(`SET SESSION max_execution_time=${deadline}`);
		return await connection.query(options, values);
	} finally {
		try {
			await connection.query(`SET SESSION max_execution_time=${previous}`);
		} catch (cause) {
			connection.destroy();
			throw cause;
		}
	}
}
