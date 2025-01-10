import mysql, { type Connection } from 'mysql2/promise';
import { getServerConfig, readConfig } from '@/lib/config.server';
import { env } from '$env/dynamic/private';

let connection: Connection | undefined = undefined

readConfig().then(() => {
	connection = mysql.createPool(getServerConfig().db ?? JSON.parse(env.DB_CREDS ?? "{}"))
})

export async function query(sql: string, values: any | undefined = undefined): Promise<{
	error?: string,
	result: mysql.QueryResult
}> {
	let result: mysql.QueryResult = []
	let error: string | undefined = undefined

	if (!connection) return {
		error: "Not ready yet",
		result
	}

	try {
		const queryResult = await connection.query(
			{
				sql,
				nestTables: true,
			},
			values
		)
		result = queryResult[0]
	} catch(e) {
		console.error("SQL exception", e)
		error = "Internal error durng query"
	}

	const parsedResult: mysql.QueryResult = []
	if (result) {
		for (const row of result) {
			const keys = Object.keys(row)
			if (!keys) continue
			const thisResult = row[keys[0]]
			const subRows = {}
			for (const subRowKey of keys.slice(1, keys.length)) {
				subRows[subRowKey] = [row[subRowKey]]
			}

			const lastResult = parsedResult[parsedResult.length - 1]
			if (lastResult && lastResult.id && lastResult.id === thisResult.id) {
				for (const subRowKey of Object.keys(subRows)) {
					if (!lastResult[subRowKey]) {
						lastResult[subRowKey] = []
					}
					lastResult[subRowKey] = [...lastResult[subRowKey], subRows[subRowKey]]
				}
			} else {
				parsedResult.push({
					...thisResult,
					...subRows
				})
			}
		}
	}

	return {
		error,
		result: parsedResult
	}
}
