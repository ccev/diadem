import { REFRESH_MASTER_STATS } from "@/lib/constants";
import { setMasterStats } from "@/lib/features/masterStats.svelte";
import { type MasterStats, queryMasterStats } from "@/lib/server/api/queryStats";
import { BaseDataProvider } from "@/lib/server/provider/dataProvider";
import { getLogger } from "@/lib/utils/logger";
import { error } from "@sveltejs/kit";

const log = getLogger("q:masterstats");

export class MasterstatsProvider extends BaseDataProvider<MasterStats> {
	private retryAfter = 0;
	constructor() {
		super(REFRESH_MASTER_STATS);
	}

	protected async query(): Promise<MasterStats> {
		if (Date.now() < this.retryAfter) error(503, "Master statistics temporarily unavailable");
		log.info("Updating master stats");
		try {
			const data = await queryMasterStats();
			this.retryAfter = 0;
			log.info("Updated master stats");
			return data;
		} catch (cause) {
			this.retryAfter = Date.now() + 10_000;
			throw cause;
		}
	}

	protected setData(data: MasterStats) {
		setMasterStats(data);
	}
}

export const masterstatsProvider = new MasterstatsProvider();
