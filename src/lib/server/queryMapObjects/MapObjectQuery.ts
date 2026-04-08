import { type MapData, MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { query as dbQuery } from "@/lib/server/db/external/internalQuery";
import { buildSpatialFilter as defaultBuildSpatialFilter } from "@/lib/server/api/spatialFilter";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";

export type MapObjectResponse<T> = {
	examined: number;
	data: T[];
};

export abstract class MapObjectQuery<MapObject extends MapData, Filter> {
	protected abstract readonly type: MapObjectType;
	protected abstract readonly limit: number;

	abstract query(
		bounds: Bounds,
		filter: Filter | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number
	): Promise<MapObjectResponse<MinMapObject<MapObject>>>;

	abstract querySingle(id: string, thisFetch?: typeof fetch): Promise<MinMapObject<MapObject>[]>;

	filter(data: MinMapObject<MapObject>, filter: Filter, polygon: PermittedPolygon): boolean {
		return true;
	}

	prepare(_data: MinMapObject<MapObject>): void {}

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
		limit?: number
	): Promise<MapObjectResponse<MapObject>> {
		const result = await this.query(bounds, filter, polygon, since, limit);
		for (const item of result.data) {
			this.prepare(item);
		}

		let examined = result.examined;
		const data: MapObject[] = [];
		for (const item of result.data) {
			if (!filter || this.filter(item, filter, polygon)) {
				data.push(this.makeMapObject(item));
			}
		}

		return { examined, data };
	}

	public async getSingle(id: string, thisFetch?: typeof fetch) {
		const mapObjects = await this.querySingle(id, thisFetch);
		if (!mapObjects.length || !mapObjects[0]) return;

		const mapObject = mapObjects[0];
		this.prepare(mapObject);
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

	private buildSelectFrom(): string {
		return `SELECT ${this.fields.join(",")} FROM ${this.table} ${this.joins}`;
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

		const sql =
			this.buildSelectFrom() + " WHERE " + whereClauses.join(" AND ") + ` LIMIT ${actualLimit}`;

		const result = await this.executeQuery<MinMapObject<MapObject>[]>(sql, values);

		return { data: result, examined: result.length };
	}

	async querySingle(id: string): Promise<MinMapObject<MapObject>[]> {
		const whereClauses = [`${this.idColumn} = ?`, ...this.extraWhere];
		const sql = this.buildSelectFrom() + " WHERE " + whereClauses.join(" AND ");

		return await this.executeQuery<MinMapObject<MapObject>[]>(sql, [id]);
	}
}
