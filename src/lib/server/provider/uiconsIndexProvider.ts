import { REFRESH_UICON_INDEX } from "@/lib/constants";
import { BulkDataProvider } from "@/lib/server/provider/dataProvider";
import { getClientConfig } from "@/lib/services/config/config.server";
import type { UiconSet } from "@/lib/services/config/configTypes";
import { getLogger } from "@/lib/utils/logger";

type UiconIndex = Map<string, string>;

const log = getLogger("q:uiconindex");

export class UiconsIndexProvider extends BulkDataProvider<string, string, UiconSet> {
	constructor() {
		super(REFRESH_UICON_INDEX);
	}

	protected async querySingle(uiconSet: UiconSet): Promise<[string, string]> {
		const data = await this.fetchData(
			uiconSet.url + "/index.json",
			log,
			`${uiconSet.name} uicon index`
		);
		return [uiconSet.id, data];
	}

	protected allKeys(): UiconSet[] {
		return getClientConfig().uiconSets;
	}

	public async getSingle(uiconsetId: string) {
		if (!this.allKeys().find((u) => u.id === uiconsetId)) {
			return;
		}

		return super.getSingle(uiconsetId);
	}
}

export const uiconsIndexProvider = new UiconsIndexProvider();
