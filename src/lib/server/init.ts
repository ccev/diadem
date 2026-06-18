import { masterfileProvider } from "@/lib/server/provider/masterfileProvider";
import { masterstatsProvider } from "@/lib/server/provider/masterStatsProvider";
import { remoteLocaleProvider } from "@/lib/server/provider/remoteLocaleProvider";
import { uiconsIndexProvider } from "@/lib/server/provider/uiconsIndexProvider";
import { getLogger } from "@/lib/utils/logger";
import { getServerConfig } from "@/lib/services/config/config.server";

export async function initDiadem() {
	const log = getLogger("init");
	log.info("Initializing Diadem");

	await Promise.all([
		masterfileProvider.refresh(),
		uiconsIndexProvider.refresh(),
		remoteLocaleProvider.refresh(),
		masterstatsProvider.refresh()
	]);

	if (getServerConfig().push?.enabled) {
		const { getActiveEntries } = await import("@/lib/server/push/registry");
		await getActiveEntries().catch((err) => log.warning(`push registry warm failed: ${err}`));
	}

	log.info("Finished initializing");
}
