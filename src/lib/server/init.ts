import { masterfileProvider } from "@/lib/server/provider/masterfileProvider";
import { masterstatsProvider } from "@/lib/server/provider/masterStatsProvider";
import { remoteLocaleProvider } from "@/lib/server/provider/remoteLocaleProvider";
import { uiconsIndexProvider } from "@/lib/server/provider/uiconsIndexProvider";
import { startFortApiDetection } from "@/lib/server/api/golbatFortApi";
import { getLogger } from "@/lib/utils/logger";

export async function initDiadem() {
	const log = getLogger("init");
	log.info("Initializing Diadem");

	await Promise.all([
		masterfileProvider.refresh(),
		uiconsIndexProvider.refresh(),
		remoteLocaleProvider.refresh(),
		masterstatsProvider.refresh(),
		startFortApiDetection()
	]);
	log.info("Finished initializing");
}
