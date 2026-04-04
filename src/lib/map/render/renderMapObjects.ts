import { type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { PokestopData, QuestReward } from "@/lib/types/mapObjectData/pokestop";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import type { StationData } from "@/lib/types/mapObjectData/station";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import type { SpawnpointData } from "@/lib/types/mapObjectData/spawnpoint";
import type { TappableData } from "@/lib/types/mapObjectData/tappable";
import type { S2CellData } from "@/lib/types/mapObjectData/s2cell";
import type { MultiPolygon, Polygon } from "geojson";
import {
	getActivePokestopFilter,
	hasFortActiveLure,
	isIncidentInvasion,
	parseQuestReward
} from "@/lib/utils/pokestopUtils";
import {
	getCircleFeature,
	getIconFeature,
	getModifiers,
	getPolygonFeature,
	type MapObjectFeature
} from "../featuresGen.svelte";
import { shouldDisplayIncidient, shouldDisplayQuest } from "@/lib/features/filterLogic/pokestop";
import {
	getCurrentUiconSetDetailsAllTypes,
	getIconForMap,
	getIconGym,
	getIconInvasion,
	getIconPokemon,
	getIconRaidEgg,
	getIconReward
} from "@/lib/services/uicons.svelte";
import {
	FORT_OUTDATED_SECONDS,
	SELECTED_MAP_OBJECT_SCALE,
	SPAWNPOINT_OUTDATED_SECONDS
} from "@/lib/constants";
import type { UiconSet } from "@/lib/services/config/configTypes";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { getActiveGymFilter, getRaidPokemon, shouldDisplayRaid } from "@/lib/utils/gymUtils";
import { getStationPokemon, shouldDisplayStation } from "@/lib/utils/stationUtils";
import { shouldDisplayNest } from "@/lib/utils/nestUtils";
import { geojson, s2 } from "s2js";

abstract class MapObjectRenderer<MapObject extends MapData> {
	protected iconSet: UiconSet | undefined;
	protected iconModifiers: ReturnType<typeof getModifiers>;
	protected styles: CSSStyleDeclaration;

	constructor(type: MapObjectType) {
		this.styles = getComputedStyle(document.documentElement);
		const iconSets = getCurrentUiconSetDetailsAllTypes();
		this.iconSet = iconSets[type];
		this.iconModifiers = getModifiers(this.iconSet, type);
	}

	protected basicIcon(
		data: MapObject,
		selectedScale: number,
		options?: { expires?: number | null; icon?: string }
	): MapObjectFeature {
		return getIconFeature(data.mapId, [data.lon, data.lat], {
			imageUrl: options?.icon ?? getIconForMap(data),
			id: data.mapId,
			imageSize: this.iconModifiers.scale,
			selectedScale,
			imageOffset: [this.iconModifiers.offsetX, this.iconModifiers.offsetY],
			expires: options?.expires ?? null
		});
	}

	public render(
		data: MapObject,
		isSelected: boolean,
		isSelectedOverwrite: boolean
	): MapObjectFeature[] {
		const selectedScale = isSelected ? SELECTED_MAP_OBJECT_SCALE : 1;
		return [this.basicIcon(data, selectedScale)];
	}
}

class PokestopRenderer extends MapObjectRenderer<PokestopData> {
	private renderQuest(
		data: PokestopData,
		reward: QuestReward,
		mapId: string,
		expires: number | null,
		modifiers: ReturnType<typeof getModifiers>,
		selectedScale: number
	): MapObjectFeature {
		return getIconFeature(mapId, [data.lon, data.lat], {
			imageUrl: getIconReward(reward.type, reward.info),
			imageSize: modifiers.scale,
			selectedScale,
			imageOffset: [
				this.iconModifiers.offsetX + modifiers.offsetX,
				this.iconModifiers.offsetY + modifiers.offsetY
			],
			id: data.mapId,
			expires
		});
	}

	public render(data: PokestopData, isSelected: boolean, isSelectedOverwrite: boolean) {
		const selectedScale = isSelected ? SELECTED_MAP_OBJECT_SCALE : 1;
		const features: MapObjectFeature[] = [];

		let showThis =
			getActivePokestopFilter().pokestopPlain.enabled ||
			(getActivePokestopFilter().lure.enabled && hasFortActiveLure(data)) ||
			isSelected ||
			isSelectedOverwrite;

		if (getActivePokestopFilter().quest.enabled || isSelectedOverwrite) {
			const questModifiers = getModifiers(this.iconSet, "quest");
			if (data.alternative_quest_target && data.alternative_quest_rewards) {
				const reward = parseQuestReward(data.alternative_quest_rewards);

				if (
					reward &&
					shouldDisplayQuest(
						reward,
						data.alternative_quest_title ?? "",
						data.alternative_quest_target,
						false,
						data
					)
				) {
					showThis = true
					const mapId = data.mapId + "-altquest-" + data.alternative_quest_timestamp;
					features.push(
						this.renderQuest(
							data,
							reward,
							mapId,
							data.alternative_quest_expiry ?? null,
							questModifiers,
							selectedScale
						)
					);
				}
			}
			if (data.quest_target && data.quest_rewards) {
				const reward = parseQuestReward(data.quest_rewards);

				if (
					reward &&
					shouldDisplayQuest(reward, data.quest_title ?? "", data.quest_target, false, data)
				) {
					showThis = true
					const mapId = data.mapId + "-quest-" + data.quest_timestamp;
					features.push(
						this.renderQuest(
							data,
							reward,
							mapId,
							data.quest_expiry ?? null,
							questModifiers,
							selectedScale
						)
					);
				}
			}
		}

		let index = 0;
		for (const incident of data?.incident ?? []) {
			if (shouldDisplayIncidient(incident, data)) {
				showThis = true;
			} else {
				continue;
			}

			if (
				!(
					(getActivePokestopFilter().invasion.enabled &&
						incident.id &&
						isIncidentInvasion(incident) &&
						incident.expiration > currentTimestamp()) ||
					isSelectedOverwrite
				)
			) {
				continue;
			}

			const mapId = data.mapId + "-incident-" + incident.id;
			const invasionModifiers = getModifiers(this.iconSet, "invasion");

			features.push(
				getIconFeature(mapId, [data.lon, data.lat], {
					imageUrl: getIconInvasion(incident.character, incident.confirmed),
					imageSize: invasionModifiers.scale,
					selectedScale,
					imageOffset: [
						this.iconModifiers.offsetX + invasionModifiers.offsetX,
						this.iconModifiers.offsetY +
							invasionModifiers.offsetY +
							index * invasionModifiers.spacing
					],
					id: data.mapId,
					expires: incident.expiration
				})
			);
			index += 1;
		}

		if (showThis) features.push(this.basicIcon(data, selectedScale));

		return features;
	}
}

class GymRenderer extends MapObjectRenderer<GymData> {
	public render(data: GymData, isSelected: boolean, isSelectedOverwrite: boolean) {
		const selectedScale = isSelected ? SELECTED_MAP_OBJECT_SCALE : 1;

		if (
			!(
				getActiveGymFilter().gymPlain.enabled ||
				shouldDisplayRaid(data) ||
				isSelected ||
				isSelectedOverwrite
			)
		) {
			return [];
		}

		const timestamp = currentTimestamp();

		if ((data.updated ?? 0) < timestamp - FORT_OUTDATED_SECONDS) {
			return [this.basicIcon(data, selectedScale, { icon: getIconGym({ team_id: 0 }) })];
		}

		const features: MapObjectFeature[] = [];

		if (shouldDisplayRaid(data)) {
			if (data.raid_pokemon_id) {
				const mapId = data.mapId + "-raidpokemon-" + data.raid_spawn_timestamp;
				let raidModifiers = getModifiers(this.iconSet, "raid_pokemon");

				if (data.availble_slots === 0 && this.iconSet?.raid_egg_6) {
					raidModifiers = getModifiers(this.iconSet, "raid_pokemon_6");
				}

				features.push(
					getIconFeature(mapId, [data.lon, data.lat], {
						imageUrl: getIconPokemon(getRaidPokemon(data)),
						imageSize:
							getModifiers(this.iconSet, MapObjectType.POKEMON).scale * raidModifiers.scale,
						selectedScale,
						imageOffset: [
							this.iconModifiers.offsetX + raidModifiers.offsetX,
							this.iconModifiers.offsetY + raidModifiers.offsetY
						],
						id: data.mapId,
						expires: data.raid_end_timestamp ?? null
					})
				);
			} else {
				const mapId = data.mapId + "-raidegg-" + data.raid_spawn_timestamp;
				let raidModifiers = getModifiers(this.iconSet, "raid_egg");

				if (data.availble_slots === 0 && this.iconSet?.raid_egg_6) {
					raidModifiers = getModifiers(this.iconSet, "raid_egg_6");
				}

				features.push(
					getIconFeature(mapId, [data.lon, data.lat], {
						imageUrl: getIconRaidEgg(data.raid_level ?? 0),
						imageSize: raidModifiers.scale,
						selectedScale,
						imageOffset: [
							this.iconModifiers.offsetX + raidModifiers.offsetX,
							this.iconModifiers.offsetY + raidModifiers.offsetY
						],
						id: data.mapId,
						expires: data.raid_battle_timestamp ?? null
					})
				);
			}
		}

		features.push(this.basicIcon(data, selectedScale));
		return features;
	}
}

class PokemonRenderer extends MapObjectRenderer<PokemonData> {
	public render(data: PokemonData, isSelected: boolean, isSelectedOverwrite: boolean) {
		const selectedScale = isSelected ? SELECTED_MAP_OBJECT_SCALE : 1;
		const timestamp = currentTimestamp();
		if (data.expire_timestamp && data.expire_timestamp < timestamp) {
			return [];
		}
		return [this.basicIcon(data, selectedScale, { expires: data.expire_timestamp })];
	}
}

class StationRenderer extends MapObjectRenderer<StationData> {
	public render(data: StationData, isSelected: boolean, isSelectedOverwrite: boolean) {
		const selectedScale = isSelected ? SELECTED_MAP_OBJECT_SCALE : 1;
		if (!shouldDisplayStation(data)) return [];

		const features: MapObjectFeature[] = [];

		if (data.battle_pokemon_id) {
			const mapId = data.mapId + "-maxbattle-" + data.battle_pokemon_id;
			const maxBattleModifiers = getModifiers(this.iconSet, "max_battle");

			features.push(
				getIconFeature(mapId, [data.lon, data.lat], {
					imageUrl: getIconPokemon(getStationPokemon(data)),
					imageSize: maxBattleModifiers.scale,
					selectedScale,
					imageOffset: [
						this.iconModifiers.offsetX + maxBattleModifiers.offsetX,
						this.iconModifiers.offsetY + maxBattleModifiers.offsetY
					],
					id: data.mapId,
					expires: data.end_time ?? null
				})
			);
		}

		features.push(this.basicIcon(data, selectedScale, { expires: data.end_time }));
		return features;
	}
}

class NestRenderer extends MapObjectRenderer<NestData> {
	constructor() {
		// uses pokemon icons
		super(MapObjectType.POKEMON);
	}

	public render(data: NestData, isSelected: boolean, isSelectedOverwrite: boolean) {
		const selectedScale = isSelected ? SELECTED_MAP_OBJECT_SCALE : 1;
		if (!shouldDisplayNest(data)) return [];

		let polygon: MultiPolygon["coordinates"];
		if (Array.isArray(data.polygon[0][0])) {
			polygon = data.polygon.map((polygon) =>
				// @ts-ignore
				polygon.map((ring) => ring.map((p) => [p.x, p.y]))
			);
		} else {
			// @ts-ignore
			polygon = [data.polygon.map((ring) => ring.map((p) => [p.x, p.y]))];
		}

		return [
			getIconFeature(data.mapId, [data.lon, data.lat], {
				imageUrl: getIconPokemon(data),
				id: data.mapId,
				imageSize: this.iconModifiers.scale,
				selectedScale,
				imageOffset: [this.iconModifiers.offsetX, this.iconModifiers.offsetY],
				expires: null
			}),
			getCircleFeature(data.mapId, [data.lon, data.lat], {
				id: data.mapId,
				strokeColor: this.styles.getPropertyValue("--nest-circle-stroke"),
				fillColor: this.styles.getPropertyValue("--nest-circle"),
				radius: 52 * this.iconModifiers.scale,
				selectedScale
			}),
			getPolygonFeature(data.mapId, polygon, {
				id: data.mapId,
				strokeColor: this.styles.getPropertyValue("--nest-polygon-stroke"),
				fillColor: this.styles.getPropertyValue("--nest-polygon"),
				selectedFill: this.styles.getPropertyValue("--nest-polygon-selected"),
				isSelected
			})
		];
	}
}

class SpawnpointRenderer extends MapObjectRenderer<SpawnpointData> {
	public render(data: SpawnpointData, isSelected: boolean, isSelectedOverwrite: boolean) {
		const selectedScale = isSelected ? SELECTED_MAP_OBJECT_SCALE : 1;
		const timestamp = currentTimestamp();
		const isOutdated = data.last_seen < timestamp - SPAWNPOINT_OUTDATED_SECONDS;
		let cssVar = "--spawnpoint";
		if (isOutdated) cssVar += "-inactive";

		return [
			getCircleFeature(data.mapId, [data.lon, data.lat], {
				id: data.mapId,
				strokeColor: this.styles.getPropertyValue(cssVar + "-stroke"),
				fillColor: this.styles.getPropertyValue(cssVar),
				radius: 3,
				selectedScale
			})
		];
	}
}

class TappableRenderer extends MapObjectRenderer<TappableData> {
	public render(data: TappableData, isSelected: boolean, isSelectedOverwrite: boolean) {
		const selectedScale = isSelected ? SELECTED_MAP_OBJECT_SCALE : 1;
		const timestamp = currentTimestamp();
		if (data.expire_timestamp && data.expire_timestamp < timestamp) {
			return [];
		}
		return [this.basicIcon(data, selectedScale, { expires: data.expire_timestamp })];
	}
}

class S2CellRenderer extends MapObjectRenderer<S2CellData> {
	public render(data: S2CellData, isSelected: boolean, isSelectedOverwrite: boolean) {
		const cell = s2.Cell.fromCellID(data.cellId);
		const polygon = geojson.toGeoJSON(cell) as Polygon;

		return [
			getPolygonFeature(data.mapId, [polygon.coordinates], {
				id: data.mapId,
				strokeColor: this.styles.getPropertyValue("--s2cell-polygon-stroke"),
				fillColor: this.styles.getPropertyValue("--s2cell-polygon"),
				selectedFill: this.styles.getPropertyValue("--s2cell-polygon-selected"),
				isSelected: false
			})
		];
	}
}

const rendererClasses: Record<
	MapObjectType,
	new (...args: ConstructorParameters<typeof MapObjectRenderer>) => MapObjectRenderer<any>
> = {
	[MapObjectType.POKESTOP]: PokestopRenderer,
	[MapObjectType.GYM]: GymRenderer,
	[MapObjectType.POKEMON]: PokemonRenderer,
	[MapObjectType.STATION]: StationRenderer,
	[MapObjectType.NEST]: NestRenderer,
	[MapObjectType.SPAWNPOINT]: SpawnpointRenderer,
	[MapObjectType.TAPPABLE]: TappableRenderer,
	[MapObjectType.S2_CELL]: S2CellRenderer,
	[MapObjectType.ROUTE]: PokemonRenderer // no-op, uses default render
};

let renderers: Partial<Record<MapObjectType, MapObjectRenderer<any>>> = {};

export function getRenderer(type: MapObjectType): MapObjectRenderer<any> {
	if (!renderers[type]) {
		renderers[type] = new rendererClasses[type](type);
	}
	return renderers[type];
}

export function clearRenderers() {
	renderers = {};
}
