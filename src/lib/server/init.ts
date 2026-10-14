import { masterfileProvider } from "@/lib/server/provider/masterfileProvider";
import { masterstatsProvider } from "@/lib/server/provider/masterStatsProvider";
import { remoteLocaleProvider } from "@/lib/server/provider/remoteLocaleProvider";
import { uiconsIndexProvider } from "@/lib/server/provider/uiconsIndexProvider";
import { startFortApiDetection } from "@/lib/server/api/golbat/fortAvailability";
import { getLogger } from "@/lib/utils/logger";
import "@/lib/server/encounterIds";
import { isPlayerIdEnabled } from "@/lib/server/api/playerIdApi";
import { ensureLinkedTrainerTable } from "@/lib/server/db/internal/ensureTables";

export async function initDiadem() {
	const log = getLogger("init");
	log.info("Initializing Diadem");

	await Promise.all([
		masterfileProvider.refresh(),
		uiconsIndexProvider.refresh(),
		remoteLocaleProvider.refresh(),
		masterstatsProvider.refresh(),
		startFortApiDetection(),
		isPlayerIdEnabled() ? ensureLinkedTrainerTable() : undefined
	]);
	log.info("Finished initializing");
}
