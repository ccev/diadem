import type { MasterFile } from "@/lib/types/masterfile";
import { getLogger } from "@/lib/utils/logger";
import { BaseDataProvider } from "@/lib/server/provider/dataProvider";
import { REFRESH_MASTER_STATS, REFRESH_MASTERFILE } from "@/lib/constants";
import { sleep } from "@/lib/utils/time";
import { type MasterStats, queryMasterStats } from "@/lib/server/api/queryStats";
import { setMasterStats } from "@/lib/features/masterStats.svelte";

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
