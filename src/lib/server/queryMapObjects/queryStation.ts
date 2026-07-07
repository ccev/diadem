import { shouldDisplayStation } from "@/lib/features/filterLogic/station";
import type { FilterStation } from "@/lib/features/filters/filters";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { requestLimits } from "@/lib/server/api/rateLimit";
import { DbMapObjectQuery } from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { FeaturePermissionContext, PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { Features } from "@/lib/utils/features";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import { stripMaxBattleFields } from "@/lib/utils/stationUtils";
import type { PokemonVisual } from "$lib/types/mapObjectData/pokemon";

export class StationQuery extends DbMapObjectQuery<StationData, FilterStation> {
	protected readonly type = MapObjectType.STATION;
	protected readonly table = "station";
	protected readonly fields = [
		"id",
		"lat",
		"lon",
		"name",
		"start_time",
		"end_time",
		"is_battle_available",
		"is_inactive",
		"battle_level",
		"battle_pokemon_id",
		"battle_pokemon_form",
		"battle_pokemon_costume",
		"battle_pokemon_gender",
		"battle_pokemon_alignment",
		"battle_pokemon_bread_mode",
		"battle_pokemon_move_1",
		"battle_pokemon_move_2",
		"updated",
		"total_stationed_pokemon",
		"total_stationed_gmax",
		"stationed_pokemon AS raw_stationed_pokemon",
		"battle_pokemon_stamina",
		"battle_pokemon_cp_multiplier"
	];
	protected readonly limit = requestLimits[MapObjectType.STATION];
	protected readonly idColumn = "station.id";

	protected getFilterWhere(filter: FilterStation | undefined): { sql: string; values: unknown[] } {
		if (filter && !filter.stationPlain.enabled && filter.maxBattle.enabled) {
			const filters = filter.maxBattle.filters.filter((f) => f.enabled);
			const clauses: string[] = [];
			const values: unknown[] = [];

			for (const filterset of filters) {
				if (filterset.isActive) {
					clauses.push(
						"is_inactive = false AND is_battle_available = true AND start_time < UNIX_TIMESTAMP() AND end_time > UNIX_TIMESTAMP()"
					);
					continue;
				}

				if (filterset.hasGmax) {
					clauses.push("total_stationed_gmax > 0");
					continue;
				}

				for (const boss of filterset.bosses ?? []) {
					const bossClauses = ["battle_pokemon_id = ?", "battle_pokemon_form = ?"];
					values.push(boss.pokemon_id, boss.form);

					if (boss.bread_mode !== undefined) {
						bossClauses.push("battle_pokemon_bread_mode = ?");
						values.push(boss.bread_mode);
					}

					clauses.push(`(${bossClauses.join(" AND ")})`);
				}
			}

			if (clauses.length) {
				return {
					sql: `is_inactive = false AND is_battle_available = true AND end_time > UNIX_TIMESTAMP() AND (${clauses.join(" OR ")})`,
					values
				};
			}

			return {
				sql: "is_inactive = false AND is_battle_available = true AND end_time > UNIX_TIMESTAMP()",
				values: []
			};
		}
		return { sql: "", values: [] };
	}

	filter(
		data: MinMapObject<StationData>,
		filter: FilterStation,
		polygon: PermittedPolygon,
		context?: FeaturePermissionContext
	): boolean {
		const plainPermitted = !context || context.isAllowedAt(Features.STATION, data.lat, data.lon);
		const maxBattlePermitted =
			!context || context.isAllowedAt(Features.MAX_BATTLE, data.lat, data.lon);

		const effectiveFilter: FilterStation =
			plainPermitted && maxBattlePermitted
				? filter
				: {
						...filter,
						stationPlain: plainPermitted
							? filter.stationPlain
							: { ...filter.stationPlain, enabled: false },
						maxBattle: maxBattlePermitted
							? filter.maxBattle
							: { ...filter.maxBattle, enabled: false }
					};

		if (!shouldDisplayStation(data, effectiveFilter)) return false;
		if (!maxBattlePermitted) {
			stripMaxBattleFields(data);
		}
		return true;
	}

	prepare(data: MinMapObject<StationData>, context?: FeaturePermissionContext): void {
		data.battle_pokemon_form = getNormalizedForm(data.battle_pokemon_id, data.battle_pokemon_form);
		if (context && !context.isAllowedAt(Features.MAX_BATTLE, data.lat, data.lon)) {
			stripMaxBattleFields(data);
		}

		if (data.raw_stationed_pokemon) {
			data.stationed_pokemon = JSON.parse(data.raw_stationed_pokemon || "[]") as PokemonVisual[];
			for (const pokemon of data.stationed_pokemon || []) {
				pokemon.form = getNormalizedForm(pokemon.pokemon_id, pokemon.form);
			}
		}
		delete data.raw_stationed_pokemon;
	}
}
