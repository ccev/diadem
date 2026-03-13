import type { MasterFile } from "@/lib/types/masterfile";
import { getLogger } from "@/lib/utils/logger";
import { BaseDataProvider } from "@/lib/server/provider/dataProvider";
import { REFRESH_MASTERFILE } from "@/lib/constants";
import { sleep } from "@/lib/utils/time";

const log = getLogger("q:masterfile");
const url = "https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/refs/heads/master/master-latest-react-map.json";

export class MasterfileProvider extends BaseDataProvider<MasterFile> {
	constructor() {
		super(REFRESH_MASTERFILE);
	}

	protected async query(): Promise<MasterFile> {
		const data = await this.fetchData(url, log, "masterfile") as MasterFile

		return {
			pokemon: data.pokemon,
			items: data.items,
			weather: data.weather
		};
	}
}

export const masterfileProvider = new MasterfileProvider();
