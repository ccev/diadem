import { ChannelCredentials, Metadata, type CallOptions, type ServiceError } from "@grpc/grpc-js";
import { GolbatApiClient } from "@/lib/server/api/grpc/golbat_api";
import {
	golbatInFlight,
	type FortCombinedScanResponse,
	type GymScanResponse,
	type PokemonResponse,
	type PokestopScanResponse,
	type StationScanResponse
} from "@/lib/server/api/golbatApi";
import {
	describeGrpcError,
	fromFortScanResponse,
	fromGymScanResponse,
	fromPokemonScanResponse,
	fromPokestopScanResponse,
	fromStationScanResponse,
	toFortCombinedScanRequest,
	toFortScanRequest,
	toPokemonScanRequest
} from "@/lib/server/api/golbatGrpcMapping";
import type {
	FortCombinedScanBody,
	FortScanBody,
	PokemonScanBody
} from "@/lib/server/queryMapObjects/queries";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("golbat:grpc");
const config = getServerConfig().golbat;
const DEADLINE_MS = 10_000;

let client: GolbatApiClient | undefined;

export function isGrpcEnabled() {
	return Boolean(config.grpc);
}

function getClient() {
	if (!client) {
		client = new GolbatApiClient(config.grpc!, ChannelCredentials.createInsecure(), {
			"grpc.keepalive_time_ms": 30_000,
			"grpc.keepalive_permit_without_calls": 1,
			// Full scans can exceed gRPC's default 4 MiB receive limit.
			"grpc.max_receive_message_length": -1,
			// Avoid repeated flow-control round trips for large scans.
			"grpc-node.flow_control_window": 16 * 1024 * 1024
		});
	}
	return client;
}

function call<Res>(
	name: string,
	invoke: (
		client: GolbatApiClient,
		metadata: Metadata,
		options: Partial<CallOptions>,
		callback: (err: ServiceError | null, res: Res) => void
	) => unknown
): Promise<Res> {
	const start = performance.now();
	const metadata = new Metadata();
	if (config.secret) metadata.set("x-golbat-secret", config.secret);

	golbatInFlight.count += 1;
	return new Promise<Res>((resolve, reject) => {
		invoke(getClient(), metadata, { deadline: Date.now() + DEADLINE_MS }, (err, res) => {
			golbatInFlight.count -= 1;
			if (err) return reject(err);
			log.debug(
				"[%s] Request took %fms (in flight %d)",
				name,
				(performance.now() - start).toFixed(1),
				golbatInFlight.count
			);
			resolve(res);
		});
	});
}

export async function grpcScanGyms(body: FortScanBody): Promise<GymScanResponse> {
	const request = toFortScanRequest(body);
	return fromGymScanResponse(
		await call("ScanGyms", (c, md, opts, cb) => c.scanGyms(request, md, opts, cb))
	);
}

export async function grpcScanPokestops(body: FortScanBody): Promise<PokestopScanResponse> {
	const request = toFortScanRequest(body);
	return fromPokestopScanResponse(
		await call("ScanPokestops", (c, md, opts, cb) => c.scanPokestops(request, md, opts, cb))
	);
}

export async function grpcScanStations(body: FortScanBody): Promise<StationScanResponse> {
	const request = toFortScanRequest(body);
	return fromStationScanResponse(
		await call("ScanStations", (c, md, opts, cb) => c.scanStations(request, md, opts, cb))
	);
}

export async function grpcScanForts(body: FortCombinedScanBody): Promise<FortCombinedScanResponse> {
	const request = toFortCombinedScanRequest(body);
	return fromFortScanResponse(
		await call("ScanForts", (c, md, opts, cb) => c.scanForts(request, md, opts, cb))
	);
}

export async function grpcScanPokemon(body: PokemonScanBody): Promise<PokemonResponse> {
	const request = toPokemonScanRequest(body);
	return fromPokemonScanResponse(
		await call("ScanPokemon", (c, md, opts, cb) => c.scanPokemon(request, md, opts, cb))
	);
}

export async function scanViaGrpcOrHttp<Body, Res>(
	name: string,
	body: Body,
	grpcScan: (body: Body) => Promise<Res>,
	httpScan: (body: Body) => Promise<Res | undefined>
): Promise<Res | undefined> {
	if (isGrpcEnabled()) {
		try {
			return await grpcScan(body);
		} catch (err) {
			log.warning("[%s] gRPC scan failed (%s), falling back to HTTP", name, describeGrpcError(err));
		}
	}
	return httpScan(body);
}
