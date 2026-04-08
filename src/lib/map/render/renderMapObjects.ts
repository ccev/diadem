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
	isIncidentInvasion
} from "@/lib/utils/pokestopUtils";
import {
	matchInvasionFilterset,
	matchQuestFilterset,
	shouldDisplayIncident,
	shouldDisplayLure,
	shouldDisplayQuest
} from "@/lib/features/filterLogic/pokestop";
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
import type { UiconSet, UiconSetModifierType } from "@/lib/services/config/configTypes";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { getActiveGymFilter, getRaidPokemon } from "@/lib/utils/gymUtils";
import { getStationPokemon } from "@/lib/utils/stationUtils";
import { matchRaidFilterset, shouldDisplayRaid } from "@/lib/features/filterLogic/gym";
import { matchMaxBattleFilterset, shouldDisplayStation } from "@/lib/features/filterLogic/station";
import { shouldDisplayNest } from "@/lib/features/filterLogic/nest";
import { geojson, s2 } from "s2js";
import {
	getCircleFeature,
	getIconFeature,
	getPolygonFeature,
	type MapObjectFeature,
	type MapObjectIconProperties,
	type MinMapObjectIconProperties
} from "@/lib/map/render/featureTypes";
import { type BadgeProperties, getBadgeFeature } from "@/lib/map/render/modifierBadge";
import type { AnyFilterset, FiltersetQuest } from "@/lib/features/filters/filtersets";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { matchPokemonFilterset } from "@/lib/features/filterLogic/pokemon";
import { getUnderlayFeature } from "@/lib/map/render/modifierUnderlay";
import { filterTitle } from "@/lib/features/filters/filtersetUtils";

export function getConfigModifiers(iconSet: UiconSet | undefined, type: UiconSetModifierType) {
	let scale: number = 0.25;
	let offsetY: number = 0;
	let offsetX: number = 0;
	let spacing: number = 0;

	if (iconSet) {
		const modifier = iconSet[type];
		const baseModifier = iconSet.base;
		if (modifier && typeof modifier === "object") {
			scale = modifier?.scale ?? baseModifier?.scale ?? scale;
			offsetY = modifier?.offsetY ?? baseModifier?.offsetY ?? offsetY;
			offsetX = modifier?.offsetX ?? baseModifier?.offsetX ?? offsetX;
			spacing = modifier?.spacing ?? baseModifier?.spacing ?? spacing;
		}
	}

	return { scale, offsetY, offsetX, spacing };
}

abstract class MapObjectRenderer<MapObject extends MapData> {
	protected iconSet: UiconSet | undefined;
	protected iconModifiers: ReturnType<typeof getConfigModifiers>;
	protected styles: CSSStyleDeclaration;

	constructor(type: MapObjectType) {
		this.styles = getComputedStyle(document.documentElement);
		const iconSets = getCurrentUiconSetDetailsAllTypes();
		this.iconSet = iconSets[type];
		this.iconModifiers = getConfigModifiers(this.iconSet, type);
	}

	protected getBasicProps(
		data: MapObject,
		selectedScale: number,
		options?: { expires?: number | null; icon?: string }
	) {
		return {
			imageUrl: options?.icon ?? getIconForMap(data),
			id: data.mapId,
			imageSize: this.iconModifiers.scale,
			selectedScale,
			imageOffset: [this.iconModifiers.offsetX, this.iconModifiers.offsetY],
			expires: options?.expires ?? null
		} as MapObjectIconProperties;
	}

	protected getFeature(
		data: MapObject,
		props: MinMapObjectIconProperties,
		options?: { id?: string }
	) {
		return getIconFeature(options?.id ?? props.id, [data.lon, data.lat], props);
	}

	protected renderBasicIcon(
		data: MapObject,
		selectedScale: number,
		options?: { expires?: number | null; icon?: string }
	): MapObjectFeature {
		return this.getFeature(data, this.getBasicProps(data, selectedScale, options));
	}

	private renderBadge(
		data: MapObject,
		id: string,
		filterset: AnyFilterset,
		props: MinMapObjectIconProperties
	) {
		const badgeFeature = getBadgeFeature(
			filterset.modifiers,
			filterset.icon,
			props.imageSize,
			props.imageOffset ?? [0, 0]
		);

		return getIconFeature(id + "-badge", [data.lon, data.lat], {
			...props,
			...badgeFeature
		});
	}

	private renderUnderlay(
		data: MapObject,
		id: string,
		filterset: AnyFilterset,
		props: MinMapObjectIconProperties
	) {
		const underlayFeature = getUnderlayFeature(
			props.imageSize,
			props.imageOffset ?? [0, 0],
			filterset.modifiers
		);

		return getIconFeature(id + "-underlay", [data.lon, data.lat], {
			...props,
			...underlayFeature
		});
	}

	public renderVisualModifiers(
		data: MapObject,
		id: string,
		filterset: AnyFilterset | undefined,
		props: MinMapObjectIconProperties
	) {
		const feats: MapObjectFeature[] = [];

		if (filterset?.modifiers?.rotation) {
			props.imageRotation = filterset.modifiers.rotation;

			if (props.imageOffset && (props.imageOffset[0] !== 0 || props.imageOffset[1] !== 0)) {
				// offset is applied in rotated space, this reverses that
				const rad = (-props.imageRotation * Math.PI) / 180;
				const cos = Math.cos(rad);
				const sin = Math.sin(rad);
				props.imageOffset = [
					props.imageOffset[0] * cos - props.imageOffset[1] * sin,
					props.imageOffset[0] * sin + props.imageOffset[1] * cos
				];
			}
		}

		const extraMainProps: Pick<MapObjectIconProperties, "textLabel" | "textOffset"> = {};
		if (filterset?.modifiers?.showLabel) {
			extraMainProps.textLabel =
				typeof filterset.modifiers.showLabel === "string"
					? filterset.modifiers.showLabel
					: filterTitle(filterset);
		}

		if (filterset?.modifiers?.scale) {
			props.imageSize *= filterset.modifiers.scale;
		}

		if (filterset) {
			feats.push(this.renderBadge(data, id, filterset, props));
		}

		feats.push(this.getFeature(data, { ...props, ...extraMainProps }, { id }));

		if (filterset) {
			feats.push(this.renderUnderlay(data, id, filterset, props));
		}

		return feats;
	}

	public render(
		data: MapObject,
		isSelected: boolean,
		isSelectedOverwrite: boolean
	): MapObjectFeature[] {
		const selectedScale = isSelected ? SELECTED_MAP_OBJECT_SCALE : 1;
		return [this.renderBasicIcon(data, selectedScale)];
	}
}

class PokestopRenderer extends MapObjectRenderer<PokestopData> {
	private renderQuest(
		data: PokestopData,
		reward: QuestReward,
		filterset: FiltersetQuest | undefined,
		mapId: string,
		expires: number | null,
		modifiers: ReturnType<typeof getConfigModifiers>,
		selectedScale: number
	): MapObjectFeature[] {
		return this.renderVisualModifiers(data, mapId, filterset, {
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
			shouldDisplayLure(data) ||
			isSelected ||
			isSelectedOverwrite;

		if (getActivePokestopFilter().quest.enabled || isSelectedOverwrite) {
			const questModifiers = getConfigModifiers(this.iconSet, "quest");
			for (const quest of data.quests) {
				if (shouldDisplayQuest(quest, data)) {
					showThis = true;
					const mapId = data.mapId + "-quest-" + quest.isAr + "-" + quest.timestamp;
					features.push(
						...this.renderQuest(
							data,
							quest.reward,
							matchQuestFilterset(quest),
							mapId,
							quest.expires ?? null,
							questModifiers,
							selectedScale
						)
					);
				}
			}
		}

		let index = 0;
		for (const incident of data?.incident ?? []) {
			if (shouldDisplayIncident(incident, data)) {
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
			const invasionModifiers = getConfigModifiers(this.iconSet, "invasion");

			features.push(
				...this.renderVisualModifiers(data, mapId, matchInvasionFilterset(incident), {
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

		if (showThis) features.push(this.renderBasicIcon(data, selectedScale));

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
			return [this.renderBasicIcon(data, selectedScale, { icon: getIconGym({ team_id: 0 }) })];
		}

		const features: MapObjectFeature[] = [];

		if (shouldDisplayRaid(data)) {
			const filterset = matchRaidFilterset(data);

			if (data.raid_pokemon_id) {
				const mapId = data.mapId + "-raidpokemon-" + data.raid_spawn_timestamp;
				let raidModifiers = getConfigModifiers(this.iconSet, "raid_pokemon");

				if (data.availble_slots === 0 && this.iconSet?.raid_egg_6) {
					raidModifiers = getConfigModifiers(this.iconSet, "raid_pokemon_6");
				}

				features.push(
					...this.renderVisualModifiers(data, mapId, filterset, {
						imageUrl: getIconPokemon(getRaidPokemon(data)),
						imageSize:
							getConfigModifiers(this.iconSet, MapObjectType.POKEMON).scale * raidModifiers.scale,
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
				let raidModifiers = getConfigModifiers(this.iconSet, "raid_egg");

				if (data.availble_slots === 0 && this.iconSet?.raid_egg_6) {
					raidModifiers = getConfigModifiers(this.iconSet, "raid_egg_6");
				}

				features.push(
					...this.renderVisualModifiers(data, mapId, filterset, {
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

		features.push(this.renderBasicIcon(data, selectedScale));
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
		return this.renderVisualModifiers(
			data,
			data.id,
			matchPokemonFilterset(data),
			this.getBasicProps(data, selectedScale, { expires: data.expire_timestamp })
		);
	}
}

class StationRenderer extends MapObjectRenderer<StationData> {
	public render(data: StationData, isSelected: boolean, isSelectedOverwrite: boolean) {
		const selectedScale = isSelected ? SELECTED_MAP_OBJECT_SCALE : 1;
		if (!shouldDisplayStation(data)) return [];

		const features: MapObjectFeature[] = [];

		if (data.battle_pokemon_id) {
			const mapId = data.mapId + "-maxbattle-" + data.battle_pokemon_id;
			const maxBattleModifiers = getConfigModifiers(this.iconSet, "max_battle");

			features.push(
				...this.renderVisualModifiers(data, mapId, matchMaxBattleFilterset(data), {
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

		features.push(this.renderBasicIcon(data, selectedScale, { expires: data.end_time }));
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
		return [this.renderBasicIcon(data, selectedScale, { expires: data.expire_timestamp })];
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
