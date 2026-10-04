import { query } from "@/lib/server/db/external/internalQuery";
import { BaseDataProvider } from "@/lib/server/provider/dataProvider";

export const TAPPABLE_AVAILABILITY_REFRESH_SECONDS = 60;

export class TappableAvailabilityProvider extends BaseDataProvider<{ available: boolean }> {
	constructor() {
		super(TAPPABLE_AVAILABILITY_REFRESH_SECONDS);
	}

	protected async query() {
		const rows = await query<{ id: string }[]>(
			"SELECT id FROM tappable WHERE expire_timestamp > UNIX_TIMESTAMP() LIMIT 1",
			[]
		);
		return { available: rows.length > 0 };
	}
}

export const tappableAvailabilityProvider = new TappableAvailabilityProvider();
