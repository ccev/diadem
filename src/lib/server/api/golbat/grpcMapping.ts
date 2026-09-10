import { status, type ServiceError } from "@grpc/grpc-js";
import type * as pb from "@/lib/server/api/grpc/golbat_api";
import type {
	FortCombinedScanResponse,
	GolbatGymResult,
	GolbatPokestopResult,
	GolbatStationResult,
	GymScanResponse,
	PokemonResponse,
	PokestopScanResponse,
	StationScanResponse,
	FortCombinedScanBody,
	FortScanBody,
	FortTypeScanGroup,
	FortTypeScanStats,
	PokemonScanBody
} from "./types";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { Incident } from "@/lib/types/mapObjectData/pokestop";
import type { PokemonData, PvpStats } from "@/lib/types/mapObjectData/pokemon";

function toLatLon(p: { latitude: number; longitude: number }): pb.LatLon {
	return { lat: p.latitude, lon: p.longitude };
}

export function toFortScanRequest(body: FortScanBody): pb.FortScanRequest {
	return {
		min: toLatLon(body.min),
		max: toLatLon(body.max),
		limit: body.limit,
		filters: body.filters ?? [],
		with_incidents: body.with_incidents ?? false
	};
}

export function toPokemonScanRequest(body: PokemonScanBody): pb.PokemonScanRequest {
	return {
		min: toLatLon(body.min),
		max: toLatLon(body.max),
		limit: body.limit,
		filters: body.filters.map(({ pokemon, ...ranges }) => ({
			...ranges,
			pokemon: pokemon?.map(({ id, form }) => ({ pokemon_id: id, form })) ?? []
		}))
	};
}

export function toFortCombinedScanRequest(body: FortCombinedScanBody): pb.FortCombinedScanRequest {
	const group = (g: FortTypeScanGroup | undefined): pb.FortTypeScanGroup | undefined =>
		g && { filters: g.filters ?? [], limit: g.limit };
	return {
		min: toLatLon(body.min),
		max: toLatLon(body.max),
		limit: body.limit,
		with_incidents: body.with_incidents ?? false,
		gyms: group(body.gyms),
		pokestops: group(body.pokestops),
		stations: group(body.stations)
	};
}

function fromGym(g: pb.Gym): GolbatGymResult {
	const { defenders_json, rsvps_json, guarding_pokemon_display_json, cell_id, ...rest } = g;
	const gym = rest as GolbatGymResult;
	if (defenders_json !== undefined) gym.defenders = JSON.parse(defenders_json);
	if (rsvps_json !== undefined) gym.rsvps = JSON.parse(rsvps_json);
	return gym;
}

export function fromGymScanResponse(res: pb.GymScanResponse): GymScanResponse {
	return {
		gyms: (res.gyms ?? []).map(fromGym),
		examined: res.examined ?? 0,
		skipped: res.skipped ?? 0,
		total: res.total ?? 0,
		limit_reached: res.limit_reached ?? false
	};
}

function fromPokestop(p: pb.Pokestop): GolbatPokestopResult {
	const {
		enabled,
		quest_rewards_json,
		alternative_quest_rewards_json,
		quest_conditions_json,
		alternative_quest_conditions_json,
		showcase_focus_json,
		showcase_rankings_json,
		cell_id,
		invasions,
		...rest
	} = p;
	const stop = rest as GolbatPokestopResult;
	if (enabled !== undefined) stop.enabled = enabled ? 1 : 0;
	if (quest_rewards_json !== undefined) stop.quest_rewards = quest_rewards_json;
	if (alternative_quest_rewards_json !== undefined)
		stop.alternative_quest_rewards = alternative_quest_rewards_json;
	if (showcase_focus_json !== undefined) stop.showcase_focus = showcase_focus_json;
	if (showcase_rankings_json !== undefined) stop.showcase_rankings = showcase_rankings_json;
	if (invasions?.length) stop.invasions = invasions as Incident[];
	return stop;
}

export function fromPokestopScanResponse(res: pb.PokestopScanResponse): PokestopScanResponse {
	return {
		pokestops: (res.pokestops ?? []).map(fromPokestop),
		examined: res.examined ?? 0,
		skipped: res.skipped ?? 0,
		total: res.total ?? 0,
		limit_reached: res.limit_reached ?? false
	};
}

function fromStation(s: pb.Station): GolbatStationResult {
	const { stationed_pokemon_json, battles, cell_id, ...rest } = s;
	const station = rest as GolbatStationResult;
	if (stationed_pokemon_json !== undefined) station.stationed_pokemon = stationed_pokemon_json;
	return station;
}

export function fromStationScanResponse(res: pb.StationScanResponse): StationScanResponse {
	return {
		stations: (res.stations ?? []).map(fromStation),
		examined: res.examined ?? 0,
		skipped: res.skipped ?? 0,
		total: res.total ?? 0,
		limit_reached: res.limit_reached ?? false
	};
}

export function fromFortScanResponse(res: pb.FortScanResponse): FortCombinedScanResponse {
	const stats = (s: pb.FortTypeScanStats | undefined): FortTypeScanStats => ({
		examined: s?.examined ?? 0,
		limit_reached: s?.limit_reached ?? false
	});
	return {
		gyms: (res.gyms ?? []).map(fromGym),
		pokestops: (res.pokestops ?? []).map(fromPokestop),
		stations: (res.stations ?? []).map(fromStation),
		examined: res.examined ?? 0,
		skipped: res.skipped ?? 0,
		total: res.total ?? 0,
		limit_reached: res.limit_reached ?? false,
		gyms_stats: stats(res.gyms_stats),
		pokestops_stats: stats(res.pokestops_stats),
		stations_stats: stats(res.stations_stats)
	};
}

function fromPokemon(p: pb.Pokemon): MinMapObject<PokemonData> {
	const { spawn_id, cell_id, pvp, ...rest } = p;
	const pokemon = rest as MinMapObject<PokemonData>;
	const rankings: NonNullable<PokemonData["pvp"]> = {};
	if (pvp?.little?.length) rankings.little = pvp.little as PvpStats[];
	if (pvp?.great?.length) rankings.great = pvp.great as PvpStats[];
	if (pvp?.ultra?.length) rankings.ultra = pvp.ultra as PvpStats[];
	if (Object.keys(rankings).length) pokemon.pvp = rankings;
	return pokemon;
}

export function fromPokemonScanResponse(res: pb.PokemonScanResponse): PokemonResponse {
	return {
		pokemon: (res.pokemon ?? []).map(fromPokemon),
		examined: res.examined ?? 0,
		skipped: res.skipped ?? 0,
		total: res.total ?? 0,
		limit_reached: res.limit_reached ?? false
	};
}

export function describeGrpcError(err: unknown): string {
	const e = err as Partial<ServiceError> | null | undefined;
	if (e && typeof e.code === "number") {
		const text = `${status[e.code] ?? e.code}: ${e.details || e.message || ""}`;
		return e.code === status.UNAUTHENTICATED
			? `${text} (server.golbat.secret must match Golbat's api_secret)`
			: text;
	}
	return String(err);
}
