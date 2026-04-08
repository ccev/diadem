import mysql from "mysql2/promise";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getDbUri } from "@/lib/services/config/dbUri.server";
import { getLogger } from "@/lib/utils/logger";
import { error } from "@sveltejs/kit";

const log = getLogger("query");

const connection = mysql.createPool({ uri: getDbUri(getServerConfig().db) });

export async function query<T>(sql: string, values?: unknown[]): Promise<T> {
	const start = performance.now();

	try {
		const [result] = await connection.query(sql, values);
		log.debug(`Query took %fms: %s`, (performance.now() - start).toFixed(1), sql);
		return result as T;
	} catch (e) {
		log.error("SQL exception", e);
		error(500);
	}
}

export async function queryJoined<T>(sql: string, values?: unknown[]): Promise<T> {
	const start = performance.now();

	let rows: mysql.QueryResult;
	try {
		const [result] = await connection.query({ sql, nestTables: true }, values);
		rows = result;
	} catch (e) {
		log.error("SQL exception", e);
		error(500);
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
