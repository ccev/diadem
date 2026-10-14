import { getServerConfig } from "@/lib/services/config/config.server";
import { BaseDataProvider } from "@/lib/server/provider/dataProvider";
import { getLogger } from "@/lib/utils/logger";
import type { ShowcaseMetadata } from "@/lib/utils/showcase";

const GAME_MASTER_URL =
	"https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json";
const MASTERFILE_URL =
	"https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/refs/heads/master/master-latest-everything.json";
const MAX_SOURCE_BYTES = 40 * 1024 * 1024;
const log = getLogger("q:showcase-metadata");

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function canonicalJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	const record = asRecord(value);
	if (record) {
		return `{${Object.keys(record)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

/** Exact symbolic species/form joins; an unknown form never borrows base metadata. */
export function parseShowcaseMetadata(
	gameMaster: unknown,
	rawMasterfile: unknown
): Map<string, ShowcaseMetadata> {
	const pokemon = asRecord(asRecord(rawMasterfile)?.pokemon);
	if (!Array.isArray(gameMaster) || !gameMaster.length || !pokemon) {
		throw new Error("Invalid Showcase metadata sources");
	}

	const extended = new Map<string, Record<string, unknown>>();
	const conflictingExtended = new Set<string>();
	for (const template of gameMaster) {
		const data = asRecord(asRecord(template)?.data);
		const settings = asRecord(data?.pokemonExtendedSettings);
		if (typeof settings?.uniqueId !== "string") continue;
		const key = `${settings.uniqueId}:${settings.form ?? ""}`;
		const previous = extended.get(key);
		if (previous && canonicalJson(previous) !== canonicalJson(settings)) {
			conflictingExtended.add(key);
		} else {
			extended.set(key, settings);
		}
	}

	const result = new Map<string, ShowcaseMetadata>();
	const seenKeys = new Set<string>();
	for (const template of gameMaster) {
		const record = asRecord(template);
		const data = asRecord(record?.data);
		const settings = asRecord(data?.pokemonSettings);
		const templateId = record?.templateId;
		if (!settings || typeof settings.pokemonId !== "string" || typeof templateId !== "string") {
			continue;
		}

		// Game Master's numeric template prefix supplies the species ID; the existing
		// Masterfile supplies numeric form enums, joined by their exact proto name.
		const speciesId = Number(/^V(\d+)_POKEMON_/.exec(templateId)?.[1]);
		const masterPokemon = asRecord(pokemon[String(speciesId)]);
		if (!Number.isSafeInteger(speciesId) || !masterPokemon || [710, 711].includes(speciesId)) {
			continue; // Pumpkaboo/Gourgeist require a separate size adapter.
		}

		let formId = 0;
		if (settings.form !== undefined && settings.form !== null) {
			const matchingForms = Object.entries(asRecord(masterPokemon.forms) ?? {}).filter(
				([, value]) => asRecord(value)?.proto === settings.form
			);
			if (matchingForms.length !== 1) continue;
			formId = Number(matchingForms[0][0]);
			if (!Number.isSafeInteger(formId) || formId < 0) continue;
		}

		const key = `${speciesId}:${formId}`;
		if (seenKeys.has(key)) {
			result.delete(key);
			continue;
		}
		seenKeys.add(key);

		const extendedKey = `${settings.pokemonId}:${settings.form ?? ""}`;
		if (conflictingExtended.has(extendedKey)) continue;
		const sizeSettings =
			asRecord(settings.sizeSettings) ?? asRecord(extended.get(extendedKey)?.sizeSettings);
		const height = settings.pokedexHeightM;
		const weight = settings.pokedexWeightKg;
		const weightStdDev = settings.weightStdDev;
		const xxlUpperBound = sizeSettings?.xxlUpperBound;
		if (
			typeof height !== "number" ||
			!Number.isFinite(height) ||
			height <= 0 ||
			typeof weight !== "number" ||
			!Number.isFinite(weight) ||
			weight <= 0 ||
			typeof weightStdDev !== "number" ||
			!Number.isFinite(weightStdDev) ||
			weightStdDev < 0 ||
			typeof xxlUpperBound !== "number" ||
			!Number.isFinite(xxlUpperBound) ||
			xxlUpperBound <= height
		) {
			continue;
		}
		result.set(key, { height, weight, weightStdDev, xxlUpperBound });
	}

	if (!result.size) throw new Error("Showcase metadata contains no supported species/forms");
	return result;
}

export class ShowcaseMetadataProvider extends BaseDataProvider<Map<string, ShowcaseMetadata>> {
	constructor() {
		super(24 * 60 * 60);
	}

	protected async query(): Promise<Map<string, ShowcaseMetadata>> {
		const playerId = getServerConfig().playerId;
		if (!playerId?.url || !playerId.apiKey) return new Map();

		const [gameMaster, masterfile] = await Promise.all(
			[GAME_MASTER_URL, MASTERFILE_URL].map(async (url) => {
				const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
				if (!response.ok) throw new Error(`Showcase metadata fetch failed: ${response.status}`);
				const length = Number(response.headers.get("content-length"));
				if (length > MAX_SOURCE_BYTES) {
					await response.body?.cancel();
					throw new Error("Showcase metadata source is too large");
				}
				const reader = response.body?.getReader();
				if (!reader) throw new Error("Showcase metadata source is empty");
				const chunks: Uint8Array[] = [];
				let bytes = 0;
				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						bytes += value.byteLength;
						if (bytes > MAX_SOURCE_BYTES) {
							await reader.cancel();
							throw new Error("Showcase metadata source is too large");
						}
						chunks.push(value);
					}
				} finally {
					reader.releaseLock();
				}
				return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks, bytes))) as unknown;
			})
		);
		const metadata = parseShowcaseMetadata(gameMaster, masterfile);
		log.info("Loaded Showcase scoring metadata for %d species/forms", metadata.size);
		return metadata;
	}

	public getMetadata(pokemonId: number, form: number): ShowcaseMetadata | undefined {
		return this.cachedData?.get(`${pokemonId}:${form}`);
	}
}

export const showcaseMetadataProvider = new ShowcaseMetadataProvider();

export function getShowcaseMetadata(pokemonId: number, form: number): ShowcaseMetadata | undefined {
	return showcaseMetadataProvider.getMetadata(pokemonId, form);
}
