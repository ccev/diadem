import type { MasterFile } from "@/lib/types/masterfile";
import { getLogger } from "@/lib/utils/logger";
import { BaseDataProvider } from "@/lib/server/provider/dataProvider";
import { REFRESH_MASTERFILE } from "@/lib/constants";
import { sleep } from "@/lib/utils/time";
import { overwriteMasterfile } from "@/lib/services/masterfile";

const log = getLogger("q:masterfile");
const url = "https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/refs/heads/master/master-latest-react-map.json";

export class MasterfileProvider extends BaseDataProvider<MasterFile> {
	constructor() {
		super(REFRESH_MASTERFILE);
	}

	protected async query(): Promise<MasterFile> {
		const rawData = await this.fetchData(url, log, "masterfile")
		const data = JSON.parse(rawData) as MasterFile

		const masterFile = {
			pokemon: data.pokemon,
			items: data.items,
			weather: data.weather
		};

		overwriteMasterfile(masterFile)

		return masterFile
	}
}

export const masterfileProvider = new MasterfileProvider();
