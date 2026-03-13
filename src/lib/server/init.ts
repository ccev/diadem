import { getLogger } from "@/lib/utils/logger";
import { masterfileProvider } from "@/lib/server/provider/masterfileProvider";
import { uiconsIndexProvider } from "@/lib/server/provider/uiconsIndexProvider";
import { remoteLocaleProvider } from "@/lib/server/provider/remoteLocaleProvider";
import { masterstatsProvider } from "@/lib/server/provider/masterStatsProvider";

export async function initDiadem() {
	const log = getLogger("init");
	log.info("Initializing Diadem");

	await Promise.all([
		masterfileProvider.query(),
		uiconsIndexProvider.query(),
		remoteLocaleProvider.query(),
		masterstatsProvider.query()
	]);
	log.info("Finished initializing");
}
