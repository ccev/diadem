import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Server, ServerCredentials, status, type Metadata } from "@grpc/grpc-js";
import {
	GolbatApiService,
	type FortCombinedScanRequest,
	type FortScanRequest,
	type GolbatApiServer
} from "./grpc/golbat_api";

// golbatGrpc.ts reads the config object once at import and its fields per call, so mutating
// this hoisted object after the server binds is enough to point the client at it.
const golbatConfig = vi.hoisted(() => ({
	url: "http://127.0.0.1:1",
	secret: "topsecret",
	grpc: "" as string | undefined
}));
vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => ({ golbat: golbatConfig })
}));

import { grpcScanForts, grpcScanGyms, isGrpcEnabled, scanViaGrpcOrHttp } from "./golbatGrpc";

let server: Server;
let received: { metadata: Metadata; request: FortScanRequest } | undefined;
let receivedCombined: FortCombinedScanRequest | undefined;
let respondWith: "ok" | "unauthenticated" | "large" = "ok";

// ~1000 chars, used to pad a large response past the grpc-js default 4MiB receive cap.
const bigDefendersJson = `[{"pokemon_id":25,"form":0,"note":"${"x".repeat(950)}"}]`;

const unimplemented = (_call: unknown, callback: (err: { code: status }) => void) =>
	callback({ code: status.UNIMPLEMENTED });

const fortBody = {
	min: { latitude: 51.5, longitude: -0.2 },
	max: { latitude: 51.6, longitude: -0.1 },
	limit: 11,
	filters: [{ raid_level: [5] }]
};

beforeAll(async () => {
	server = new Server();
	const impl: GolbatApiServer = {
		scanGyms(call, callback) {
			received = { metadata: call.metadata, request: call.request };
			if (respondWith === "unauthenticated") {
				callback({ code: status.UNAUTHENTICATED, details: "invalid or missing api secret" });
				return;
			}
			if (respondWith === "large") {
				const gyms = Array.from({ length: 6000 }, (_, i) => ({
					id: `g${i}`,
					lat: 1.5,
					lon: 2.5,
					updated: 100,
					deleted: false,
					first_seen_timestamp: 1,
					team_id: 2,
					available_slots: 4,
					defenders_json: bigDefendersJson
				}));
				callback(null, {
					gyms,
					examined: gyms.length,
					skipped: 0,
					total: gyms.length,
					limit_reached: false
				});
				return;
			}
			callback(null, {
				gyms: [
					{
						id: "g1",
						lat: 1.5,
						lon: 2.5,
						updated: 100,
						deleted: false,
						first_seen_timestamp: 1,
						team_id: 2,
						available_slots: 4,
						defenders_json: '[{"pokemon_id":25,"form":0}]',
						rsvps_json: "[]",
						guarding_pokemon_display_json: "{}",
						cell_id: "5221390000000000000"
					}
				],
				examined: 1,
				skipped: 0,
				total: 1,
				limit_reached: false
			});
		},
		scanPokestops: unimplemented,
		scanStations: unimplemented,
		scanForts(call, callback) {
			receivedCombined = call.request;
			callback(null, {
				gyms: [
					{ id: "g1", lat: 1.5, lon: 2.5, updated: 100, deleted: false, first_seen_timestamp: 1 }
				],
				pokestops: [],
				stations: [
					{
						id: "s1",
						lat: 1,
						lon: 2,
						name: "S",
						updated: 9,
						is_inactive: false,
						is_battle_available: true
					}
				],
				examined: 40,
				skipped: 0,
				total: 40,
				limit_reached: false,
				gyms_stats: { examined: 25, limit_reached: false },
				pokestops_stats: { examined: 0, limit_reached: false },
				stations_stats: { examined: 15, limit_reached: true }
			});
		},
		scanPokemon: unimplemented,
		getPokemon: unimplemented
	};
	server.addService(GolbatApiService, impl);
	const port = await new Promise<number>((resolve, reject) =>
		server.bindAsync("127.0.0.1:0", ServerCredentials.createInsecure(), (err, p) =>
			err ? reject(err) : resolve(p)
		)
	);
	golbatConfig.grpc = `127.0.0.1:${port}`;
});

afterAll(() => {
	server.forceShutdown();
});

beforeEach(() => {
	received = undefined;
	receivedCombined = undefined;
	respondWith = "ok";
});

describe("golbatGrpc", () => {
	it("is enabled when the grpc target is configured", () => {
		expect(isGrpcEnabled()).toBe(true);
	});

	it("sends the secret as x-golbat-secret metadata and maps the response", async () => {
		const res = await grpcScanGyms(fortBody);

		expect(received?.metadata.get("x-golbat-secret")).toEqual(["topsecret"]);
		expect(received?.request.min).toEqual({ lat: 51.5, lon: -0.2 });
		expect(received?.request.max).toEqual({ lat: 51.6, lon: -0.1 });
		expect(received?.request.limit).toBe(11);
		expect(received?.request.with_incidents).toBe(false);
		expect(received?.request.filters).toHaveLength(1);
		expect(received?.request.filters?.[0].raid_level).toEqual([5]);
		expect(received?.request.filters?.[0].team_id).toEqual([]);

		expect(res.examined).toBe(1);
		expect(res.limit_reached).toBe(false);
		expect(res.gyms).toHaveLength(1);
		expect(res.gyms[0].id).toBe("g1");
		expect(res.gyms[0].available_slots).toBe(4);
		expect(res.gyms[0].defenders).toEqual([{ pokemon_id: 25, form: 0 }]);
		expect(res.gyms[0].rsvps).toEqual([]);
		expect(res.gyms[0]).not.toHaveProperty("cell_id");
	});

	it("rejects with the grpc status code on error", async () => {
		respondWith = "unauthenticated";
		await expect(grpcScanGyms(fortBody)).rejects.toMatchObject({ code: status.UNAUTHENTICATED });
	});

	it("receives a response over the 4MiB grpc-js default without RESOURCE_EXHAUSTED", async () => {
		respondWith = "large";
		const res = await grpcScanGyms(fortBody);
		expect(res.gyms).toHaveLength(6000);
	});

	it("round-trips a combined fort scan with per-type groups and stats", async () => {
		const res = await grpcScanForts({
			min: { latitude: 51.5, longitude: -0.2 },
			max: { latitude: 51.6, longitude: -0.1 },
			limit: 22,
			with_incidents: true,
			gyms: { filters: [{ raid_level: [5] }], limit: 11 },
			stations: { filters: [{ station_active: true, battle_available: true }], limit: 11 }
		});

		expect(receivedCombined?.limit).toBe(22);
		expect(receivedCombined?.with_incidents).toBe(true);
		expect(receivedCombined?.gyms?.limit).toBe(11);
		expect(receivedCombined?.gyms?.filters?.[0].raid_level).toEqual([5]);
		expect(receivedCombined?.pokestops).toBeUndefined();
		expect(receivedCombined?.stations?.filters?.[0].battle_available).toBe(true);

		expect(res.gyms.map((g) => g.id)).toEqual(["g1"]);
		expect(res.pokestops).toEqual([]);
		expect(res.stations[0]).toMatchObject({ id: "s1", is_battle_available: true });
		expect(res.gyms_stats).toEqual({ examined: 25, limit_reached: false });
		expect(res.stations_stats).toEqual({ examined: 15, limit_reached: true });
	});
});

describe("scanViaGrpcOrHttp", () => {
	it("returns the grpc result without touching http when grpc succeeds", async () => {
		const http = vi.fn();
		const res = await scanViaGrpcOrHttp("gym", fortBody, grpcScanGyms, http);
		expect(res?.gyms[0].id).toBe("g1");
		expect(http).not.toHaveBeenCalled();
	});

	it("falls back to http with the same body when grpc fails", async () => {
		respondWith = "unauthenticated";
		const http = vi
			.fn()
			.mockResolvedValue({ gyms: [], examined: 0, skipped: 0, total: 0, limit_reached: false });
		const res = await scanViaGrpcOrHttp("gym", fortBody, grpcScanGyms, http);
		expect(http).toHaveBeenCalledWith(fortBody);
		expect(res).toEqual({ gyms: [], examined: 0, skipped: 0, total: 0, limit_reached: false });
	});

	it("goes straight to http when grpc is not configured", async () => {
		const saved = golbatConfig.grpc;
		golbatConfig.grpc = undefined;
		try {
			const grpc = vi.fn();
			const http = vi.fn().mockResolvedValue(undefined);
			expect(isGrpcEnabled()).toBe(false);
			const res = await scanViaGrpcOrHttp("gym", fortBody, grpc, http);
			expect(grpc).not.toHaveBeenCalled();
			expect(http).toHaveBeenCalledWith(fortBody);
			expect(res).toBeUndefined();
		} finally {
			golbatConfig.grpc = saved;
		}
	});
});
