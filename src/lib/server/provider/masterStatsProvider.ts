import { REFRESH_MASTER_STATS } from "@/lib/constants";
import { setMasterStats } from "@/lib/features/masterStats.svelte";
import { type MasterStats, queryMasterStats } from "@/lib/server/api/queryStats";
import { BaseDataProvider } from "@/lib/server/provider/dataProvider";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("q:masterstats");

export class MasterstatsProvider extends BaseDataProvider<MasterStats> {
	constructor() {
		super(REFRESH_MASTER_STATS);
	}

	protected async query(): Promise<MasterStats> {
		log.info("Updating master stats");
		const data = await queryMasterStats();
		setMasterStats(data);
		log.info("Updated master stats");
		return data;
	}
}

export const masterstatsProvider = new MasterstatsProvider();
