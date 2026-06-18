import { masterfileProvider } from "@/lib/server/provider/masterfileProvider";
import { masterstatsProvider } from "@/lib/server/provider/masterStatsProvider";
import { remoteLocaleProvider } from "@/lib/server/provider/remoteLocaleProvider";
import { uiconsIndexProvider } from "@/lib/server/provider/uiconsIndexProvider";
import { setRemoteLocales } from "@/lib/services/ingameLocale";
import { initIconSetFromIndex } from "@/lib/services/uicons.svelte";
import { getLogger } from "@/lib/utils/logger";
import { getClientConfig, getServerConfig } from "@/lib/services/config/config.server";
import type { UiconsIndex } from "uicons.js";

export async function initDiadem() {
	const log = getLogger("init");
	log.info("Initializing Diadem");

	const [, uiconIndexes, remoteLocales] = await Promise.all([
		masterfileProvider.refresh(),
		uiconsIndexProvider.refresh(),
		remoteLocaleProvider.refresh(),
		masterstatsProvider.refresh()
	]);

	for (const [id, rawIndex] of uiconIndexes.entries()) {
		const config = getClientConfig().uiconSets.find((set) => set.id === id);
		if (!config) continue;
		initIconSetFromIndex(id, config.url, JSON.parse(rawIndex) as UiconsIndex);
	}
	setRemoteLocales(Object.fromEntries(remoteLocales));

	if (getServerConfig().push?.enabled) {
		const { getActiveEntries } = await import("@/lib/server/push/registry");
		await getActiveEntries().catch((err) => log.warning(`push registry warm failed: ${err}`));
	}

	log.info("Finished initializing");
}
