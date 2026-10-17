import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import { booleanPointInPolygon, point } from "@turf/turf";
import { s2 } from "s2js";

export type TalonflameGroup = Pick<
	NestData,
	"id" | "name" | "area_name" | "pokemon_id" | "form"
> & { last_changed: number | null };

export type TalonflameMember = { nest_id: string; spawnpoint_id: string };

export function buildTalonflameNests(
	groups: TalonflameGroup[],
	members: TalonflameMember[],
	bounds?: Bounds,
	permission?: PermittedPolygon
): MinMapObject<NestData>[] {
	const byGroup = new Map<string, string[]>();
	for (const member of members) {
		const points = byGroup.get(member.nest_id) ?? [];
		points.push(member.spawnpoint_id);
		byGroup.set(member.nest_id, points);
	}

	const result: MinMapObject<NestData>[] = [];
	for (const group of groups) {
		const cells: { lat: number; lon: number; cell: s2.Cell }[] = [];
		for (const token of byGroup.get(group.id) ?? []) {
			// Golbat stores shortened level-20 S2 IDs as decimal integers, not hex
			// tokens. Preserve integer precision and restore their low 20 bits.
			if (!/^\d+$/.test(token)) continue;
			const id = BigInt(token) << 20n;
			if (id >= 1n << 64n || !s2.cellid.valid(id) || s2.cellid.level(id) !== 20) continue;
			const cell = s2.Cell.fromCellID(id);
			const center = s2.LatLng.fromPoint(cell.center());
			const lat = (center.lat * 180) / Math.PI;
			const lon = (center.lng * 180) / Math.PI;
			if (permission && !booleanPointInPolygon(point([lon, lat]), permission)) continue;
			cells.push({ lat, lon, cell });
		}
		if (!cells.length) continue;

		const visible = bounds
			? cells.filter(
					({ lat, lon }) =>
						lat >= bounds.minLat &&
						lat <= bounds.maxLat &&
						(bounds.minLon <= bounds.maxLon
							? lon >= bounds.minLon && lon <= bounds.maxLon
							: lon >= bounds.minLon || lon <= bounds.maxLon)
				)
			: cells;
		if (!visible.length) continue;
		// Anchor on an actual member, nearest the group's spherical center, so
		// sparse/merged groups don't put their marker in a hole or another nest.
		const center = visible.reduce(
			(sum, member) => sum.add(member.cell.center().vector),
			new s2.Point(0, 0, 0).vector
		);
		const anchor = visible.reduce((best, member) =>
			member.cell.center().vector.dot(center) > best.cell.center().vector.dot(center)
				? member
				: best
		);
		const polygon = cells.map(({ cell, lon }) => {
			const ring = Array.from({ length: 4 }, (_, i) => {
				const vertex = s2.LatLng.fromPoint(cell.vertex(i));
				let x = (vertex.lng * 180) / Math.PI;
				while (x - lon > 180) x -= 360;
				while (x - lon < -180) x += 360;
				return { x, y: (vertex.lat * 180) / Math.PI };
			});
			ring.push({ ...ring[0] });
			return [ring];
		});
		result.push({
			...group,
			lat: anchor.lat,
			lon: anchor.lon,
			polygon,
			spawnpoints: cells.length,
			m2: cells.reduce((area, { cell }) => area + cell.exactArea() * 6371008.8 ** 2, 0),
			active: 1,
			pokemon_avg: null,
			pokemon_ratio: null,
			pokemon_count: null,
			discarded: null,
			updated: null
		});
	}
	return result;
}
