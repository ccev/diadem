import mysql from "mysql2/promise";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getDbUri } from "@/lib/services/config/dbUri.server";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("query");

const connection = mysql.createPool(getDbUri(getServerConfig().db));

export async function query<T>(
	sql: string,
	values: any | undefined = undefined
): Promise<{
	error: number | undefined;
	result: T;
}> {
	const start = performance.now();
	let result: mysql.QueryResult = [];
	let error: number | undefined = undefined;

	try {
		const queryResult = await connection.query(
			{
				sql,
				nestTables: true
			},
			values
		);
		result = queryResult[0];
	} catch (e) {
		log.error("SQL exception", e);
		error = 500;
	}

	const parsedResult: mysql.QueryResult = [];
	// TODO: Fix this shit
	if (result) {
		for (const row of result) {
			const keys = Object.keys(row);
			if (!keys) continue;
			const thisResult = row[keys[0]];
			const subRows = {};
			for (const subRowKey of keys.slice(1, keys.length)) {
				subRows[subRowKey] = [row[subRowKey]];
			}

			const lastResult = parsedResult[parsedResult.length - 1];
			if (lastResult && lastResult.id && lastResult.id === thisResult.id) {
				for (const subRowKey of Object.keys(subRows)) {
					if (!lastResult[subRowKey]) {
						lastResult[subRowKey] = [];
					}
					lastResult[subRowKey] = [...lastResult[subRowKey], subRows[subRowKey][0]];
				}
			} else {
				parsedResult.push({
					...thisResult,
					...subRows
				});
			}
		}
	}

	log.debug(`Query took %fms: %s`, (performance.now() - start).toFixed(1), sql);
	return {
		error,
		result: parsedResult
	};
}
