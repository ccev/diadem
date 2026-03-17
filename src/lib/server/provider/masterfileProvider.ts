import type { MasterFile, MasterPokemon, MasterWeather } from "@/lib/types/masterfile";
import { getLogger } from "@/lib/utils/logger";
import { BaseDataProvider } from "@/lib/server/provider/dataProvider";
import { REFRESH_MASTERFILE } from "@/lib/constants";
import { overwriteMasterfile } from "@/lib/services/masterfile";

type RawMasterFile = {
	pokemon: {
		[key: string]: {
			pokedexId: number,
			defaultFormId?: number;
			name: string;
			types: { [key: string]: any };
			forms?: (Partial<RawMasterFile["pokemon"]> & { form: number })[];
			tempEvolutions?: (Partial<RawMasterFile["pokemon"]> & { tempEvoId: number })[];
			legendary?: boolean;
			mythical?: boolean;
			ultraBeast?: boolean;
			family?: number
		};
	};
	items: { [key: string]: { name: string } };
	weather: {
		[key: string]: {
			name: string;
			types: { typeId: number }[]
		}
	};
};

function makePokemon(data: Partial<RawMasterFile["pokemon"][string]>, basePokemon: MasterPokemon | undefined = undefined): MasterPokemon {
	const masterPokemon = {
		name: data.name ?? "",
		forms: {},
		tempEvos: {},
		legendary: !!data.legendary,
		mythical: !!data.mythical,
		ultraBeast: !!data.ultraBeast,
		defaultFormId: data.defaultFormId,
		types: data.types ? Object.keys(data.types || {}).map(Number) : (basePokemon?.types || []),
		family: data.family ?? basePokemon?.family ?? 0
	} as MasterPokemon;

	if (data.forms) {
		for (const form of Object.values(data.forms)) {
			masterPokemon.forms[form.form.toString()] = makePokemon(form, masterPokemon);
		}
	}

	if (data.tempEvolutions) {
		for (const evo of Object.values(data.tempEvolutions)) {
			masterPokemon.tempEvos[evo.tempEvoId.toString()] = makePokemon(evo, masterPokemon);
		}
	}

	return masterPokemon
}

const log = getLogger("q:masterfile");
const url = "https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/refs/heads/master/master-latest-everything.json";

export class MasterfileProvider extends BaseDataProvider<MasterFile> {
	constructor() {
		super(REFRESH_MASTERFILE);
	}

	protected async query(): Promise<MasterFile> {
		const rawData = await this.fetchData(url, log, "masterfile")
		const data = JSON.parse(rawData) as RawMasterFile

		const masterFile = {
			pokemon: {},
			items: Object.keys(data.items),
			weather: {}
		} as MasterFile;

		for (const [id, pokemon] of Object.entries(data.pokemon)) {
			masterFile.pokemon[id] = makePokemon(pokemon)
		}

		for (const [id, w] of Object.entries(data.weather)) {
			masterFile.weather[id] = {
				types: w.types.map(t => t.typeId)
			};
		}

		overwriteMasterfile(masterFile)

		return masterFile
	}
}

export const masterfileProvider = new MasterfileProvider();
