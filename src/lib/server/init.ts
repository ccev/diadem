import { masterfileProvider } from "@/lib/server/provider/masterfileProvider";
import { masterstatsProvider } from "@/lib/server/provider/masterStatsProvider";
import { remoteLocaleProvider } from "@/lib/server/provider/remoteLocaleProvider";
import { uiconsIndexProvider } from "@/lib/server/provider/uiconsIndexProvider";
import { startFortApiDetection } from "@/lib/server/api/golbat/fortAvailability";
import { getLogger } from "@/lib/utils/logger";
import { showcaseMetadataProvider } from "@/lib/server/provider/showcaseMetadata";

export async function initDiadem() {
	const log = getLogger("init");
	log.info("Initializing Diadem");

	await Promise.all([
		masterfileProvider.refresh(),
		uiconsIndexProvider.refresh(),
		remoteLocaleProvider.refresh(),
		masterstatsProvider.refresh(),
		showcaseMetadataProvider.refresh().catch((err) => {
			log.warning("Showcase scoring metadata unavailable: %s", err);
		}),
		startFortApiDetection()
	]);
	log.info("Finished initializing");
}
