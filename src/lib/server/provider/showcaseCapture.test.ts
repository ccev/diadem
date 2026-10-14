import { describe, expect, it, vi } from "vitest";
import { PokemonScanResponse } from "@/lib/server/api/grpc/golbat_api";
import { fromPokemonScanResponse } from "@/lib/server/api/golbat/grpcMapping";
import { parseShowcaseMetadata } from "@/lib/server/provider/showcaseMetadata";
import { calculateShowcaseScore } from "@/lib/utils/showcase";
import capture from "./fixtures/showcase/pawmi-capture.json";
import metadataSource from "./fixtures/showcase/pawmi-metadata.json";
import reference from "./fixtures/showcase/pawmi-reference.json";

vi.mock("@/lib/services/config/config.server", () => ({ getServerConfig: () => ({}) }));

describe("captured personal dimensions through metadata and scoring", () => {
	const metadata = parseShowcaseMetadata(metadataSource.gameMaster, metadataSource.masterfile);
	// Only the record was captured. This envelope exists solely for wire replay;
	// the original response was partial and must not be admitted as a complete scan.
	const decoded = PokemonScanResponse.decode(
		PokemonScanResponse.encode(
			PokemonScanResponse.fromJSON({ pokemon: [capture.pokemon] })
		).finish()
	);
	const grpcPokemon = fromPokemonScanResponse(decoded).pokemon[0];

	it.each([
		["HTTP decimals", capture.pokemon, reference.expected.http_json_decimal.float64],
		["gRPC float32", grpcPokemon, reference.expected.grpc_float32_exact.float64]
	])("matches the independent calculator reference after %s", (_transport, pokemon, expected) => {
		const exactMetadata = metadata.get(`${pokemon.pokemon_id}:${pokemon.form}`);
		expect(exactMetadata).toEqual({
			height: 0.3,
			weight: 2.5,
			weightStdDev: 0.3125,
			xxlUpperBound: 0.465
		});
		const dimensions = pokemon.size_for?.["fixture-trainer"];
		expect(dimensions).toBeDefined();
		expect(
			calculateShowcaseScore(exactMetadata, {
				...pokemon,
				height: dimensions!.height,
				weight: dimensions!.weight
			})
		).toBeCloseTo(expected, 10);
	});

	it("keeps the captured Normal form separate from form zero", () => {
		expect(metadata.get("921:3236")).toBeDefined();
		expect(metadata.get("921:0")).toBeUndefined();
	});
});
