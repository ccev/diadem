import { status, type ServiceError } from "@grpc/grpc-js";
import type * as pb from "@/lib/server/api/grpc/golbat_api";
import type {
	GolbatGymResult,
	GolbatPokestopResult,
	GolbatStationResult,
	GymScanResponse,
	PokemonResponse,
	PokestopScanResponse,
	StationScanResponse
} from "@/lib/server/api/golbatApi";
import type { FortScanBody, PokemonScanBody } from "@/lib/server/queryMapObjects/queries";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { Incident } from "@/lib/types/mapObjectData/pokestop";
import type { PokemonData, PvpStats } from "@/lib/types/mapObjectData/pokemon";

// Pure conversions between the HTTP request/response shapes used throughout diadem and the
// generated protobuf messages. Kept free of config and channel state so they unit test alone.
// NOTE: no runtime import of pokemonUtils here (it pulls Svelte-only state into vitest); the
// League keys below are its literal enum values.

function toLatLon(p: { latitude: number; longitude: number }): pb.LatLon {
	return { lat: p.latitude, lon: p.longitude };
}

export function toFortScanRequest(body: FortScanBody): pb.FortScanRequest {
	return {
		min: toLatLon(body.min),
		max: toLatLon(body.max),
		limit: body.limit,
		// GolbatFortDnfFilter is structurally a FortDnfFilter; [] means "every fort" like omission
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

function fromGym(g: pb.Gym): GolbatGymResult {
	const { defenders_json, rsvps_json, guarding_pokemon_display_json, cell_id, ...rest } = g;
	const gym = rest as GolbatGymResult;
	// Same native shape the HTTP API sends; mapGym/prepare() take it from there.
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
	// JSON text, exactly what SQL delivers; mapPokestop's blobToString passes strings through.
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

/** "UNAVAILABLE: connect failed" style summary for log lines; hints at the secret on auth failure. */
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
