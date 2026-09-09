import { ChannelCredentials, Metadata, type CallOptions, type ServiceError } from "@grpc/grpc-js";
import { GolbatApiClient } from "@/lib/server/api/grpc/golbat_api";
import type {
	GymScanResponse,
	PokemonResponse,
	PokestopScanResponse,
	StationScanResponse
} from "@/lib/server/api/golbatApi";
import {
	describeGrpcError,
	fromGymScanResponse,
	fromPokemonScanResponse,
	fromPokestopScanResponse,
	fromStationScanResponse,
	toFortScanRequest,
	toPokemonScanRequest
} from "@/lib/server/api/golbatGrpcMapping";
import type { FortScanBody, PokemonScanBody } from "@/lib/server/queryMapObjects/queries";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("golbat:grpc");
const config = getServerConfig().golbat;
// Matches callGolbat's HTTP timeout (golbatApi.ts) so the gRPC -> HTTP -> SQL fallback chain
// doesn't triple the wait when Golbat is wedged.
const DEADLINE_MS = 10_000;

let client: GolbatApiClient | undefined;

export function isGrpcEnabled() {
	return Boolean(config.grpc);
}

// One channel per process; grpc-js reconnects on its own.
function getClient() {
	if (!client) {
		client = new GolbatApiClient(config.grpc!, ChannelCredentials.createInsecure(), {
			"grpc.keepalive_time_ms": 30_000,
			"grpc.keepalive_permit_without_calls": 1,
			// grpc-js defaults to a 4MiB receive cap; a full 10,000-object scan with JSON blobs or
			// PVP easily exceeds that and would RESOURCE_EXHAUST into a silent HTTP fallback.
			"grpc.max_receive_message_length": -1,
			// grpc-js keeps HTTP/2's 64KiB initial flow-control window and never grows it, so a
			// 1MB scan response costs ~16 window-update round trips; grpc-go auto-tunes this,
			// grpc-js needs it set explicitly. 16MiB covers the largest scan in one window.
			"grpc-node.flow_control_window": 16 * 1024 * 1024
		});
	}
	return client;
}

// Same log format as callGolbat so HTTP and gRPC timings compare in one stream.
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

	return new Promise<Res>((resolve, reject) => {
		invoke(getClient(), metadata, { deadline: Date.now() + DEADLINE_MS }, (err, res) => {
			if (err) return reject(err);
			log.debug("[%s] Request took %fms", name, (performance.now() - start).toFixed(1));
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

export async function grpcScanPokemon(body: PokemonScanBody): Promise<PokemonResponse> {
	const request = toPokemonScanRequest(body);
	return fromPokemonScanResponse(
		await call("ScanPokemon", (c, md, opts, cb) => c.scanPokemon(request, md, opts, cb))
	);
}

/**
 * The one place that chooses the transport: gRPC when configured, falling through to HTTP on
 * any gRPC error. HTTP errors are the caller's (they already fall back to SQL or 500).
 */
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
