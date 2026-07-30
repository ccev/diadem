import type { Bounds } from "@/lib/mapObjects/mapBounds";
import { type MapData, MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { buildSpatialFilter as defaultBuildSpatialFilter } from "@/lib/server/api/spatialFilter";
import { query as dbQuery } from "@/lib/server/db/external/internalQuery";
import type { FeaturePermissionContext, PermittedPolygon } from "@/lib/services/user/checkPerm";

export type MapObjectResponse<T> = {
	examined: number;
	data: T[];
	/** True when more objects matched than the request limit allows. No data is returned in that case. */
	limitReached?: boolean;
};

export abstract class MapObjectQuery<MapObject extends MapData, Filter> {
	protected abstract readonly type: MapObjectType;
	protected abstract readonly limit: number;

	abstract query(
		bounds: Bounds,
		filter: Filter | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number,
		context?: FeaturePermissionContext
	): Promise<MapObjectResponse<MinMapObject<MapObject>>>;

	abstract querySingle(id: string, thisFetch?: typeof fetch): Promise<MinMapObject<MapObject>[]>;

	filter(
		data: MinMapObject<MapObject>,
		filter: Filter,
		polygon: PermittedPolygon,
		context?: FeaturePermissionContext
	): boolean {
		return true;
	}

	// When a permission context is given, strips sub-features/data the user can't see at this location.
	prepare(_data: MinMapObject<MapObject>, _context?: FeaturePermissionContext): void {}

	makeMapObject(data: MinMapObject<MapObject>): MapObject {
		return {
			type: this.type,
			mapId: this.type + "-" + data.id,
			...data
		} as MapObject;
	}

	public async getMultiple(
		bounds: Bounds,
		filter: Filter | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number,
		context?: FeaturePermissionContext
	): Promise<MapObjectResponse<MapObject>> {
		const result = await this.query(bounds, filter, polygon, since, limit, context);

		if (result.limitReached) {
			return {
				examined: result.examined,
				data: [],
				limitReached: true
			};
		}

		for (const item of result.data) {
			this.prepare(item, context);
		}

		let examined = result.examined;
		const data: MapObject[] = [];
		for (const item of result.data) {
			if (!filter || this.filter(item, filter, polygon, context)) {
				data.push(this.makeMapObject(item));
			}
		}

		return { examined, data };
	}

	public async getSingle(id: string, thisFetch?: typeof fetch, context?: FeaturePermissionContext) {
		const mapObjects = await this.querySingle(id, thisFetch);
		if (!mapObjects.length || !mapObjects[0]) return;

		const mapObject = mapObjects[0];
		this.prepare(mapObject, context);
		return this.makeMapObject(mapObject);
	}
}

export abstract class DbMapObjectQuery<MapObject extends MapData, Filter> extends MapObjectQuery<
	MapObject,
	Filter
> {
	protected abstract readonly table: string;
	protected abstract readonly fields: string[];
	protected abstract readonly idColumn: string;
	protected readonly updatedColumn: string = "updated";
	protected readonly pointExpr: string = "Point(lon, lat)";
	protected readonly extraWhere: string[] = [];
	protected readonly joins: string = "";

	protected getFilterWhere(_filter: Filter | undefined): { sql: string; values: unknown[] } {
		return { sql: "", values: [] };
	}

	protected async executeQuery<T>(sql: string, values: unknown[]): Promise<T> {
		return await dbQuery<T>(sql, values);
	}

	protected buildSpatialFilter(
		polygon: PermittedPolygon,
		bounds: Bounds
	): { sql: string; values: unknown[] } {
		return defaultBuildSpatialFilter(polygon, bounds, this.pointExpr);
	}

	protected buildSelectFrom(): string {
		return `SELECT ${this.fields.join(",")} FROM ${this.table} ${this.joins}`;
	}

	protected buildLimitedQuery(
		whereSql: string,
		values: unknown[],
		actualLimit: number
	): { sql: string; values: unknown[] } {
		return {
			sql: this.buildSelectFrom() + whereSql + ` LIMIT ${actualLimit + 1}`,
			values
		};
	}

	async query(
		bounds: Bounds,
		filter: Filter | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number
	): Promise<MapObjectResponse<MinMapObject<MapObject>>> {
		const spatial = this.buildSpatialFilter(polygon, bounds);
		const filterWhere = this.getFilterWhere(filter);

		const whereClauses = [spatial.sql, ...this.extraWhere];
		if (filterWhere.sql) whereClauses.push(filterWhere.sql);

		const values = [...spatial.values, ...filterWhere.values];

		if (since !== undefined) {
			whereClauses.push(`${this.updatedColumn} > ?`);
			values.push(since);
		}

		const actualLimit = Math.min(limit ?? this.limit, this.limit);

		const whereSql = " WHERE " + whereClauses.join(" AND ");
		const limitedQuery = this.buildLimitedQuery(whereSql, values, actualLimit);
		const result = await this.executeQuery<MinMapObject<MapObject>[]>(
			limitedQuery.sql,
			limitedQuery.values
		);

		if (result.length <= actualLimit) {
			return { data: result, examined: result.length };
		}

		return {
			data: [],
			examined: actualLimit,
			limitReached: true
		};
	}

	async querySingle(id: string): Promise<MinMapObject<MapObject>[]> {
		const whereClauses = [`${this.idColumn} = ?`, ...this.extraWhere];
		const sql = this.buildSelectFrom() + " WHERE " + whereClauses.join(" AND ");

		return await this.executeQuery<MinMapObject<MapObject>[]>(sql, [id]);
	}
}
