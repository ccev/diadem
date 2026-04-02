import { time } from "@/lib/utils/time";
import * as m from "@/lib/paraglide/messages";

export function timestampToLocalTime(
	timestamp: number | null | undefined,
	showDate: boolean = false,
	showSeconds: boolean = true
) {
	if (!timestamp) return "";

	const date = new Date(timestamp * 1000);
	const timeString = date.toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit"
	});

	if (showDate) {
		const today = new Date();

		if (time(today, date)) {
			return m.today_time({ time: date.toLocaleTimeString() });
		}

		today.setDate(today.getDate() - 1);
		if (time(today, date)) {
			return m.yesterday_time({ time: date.toLocaleTimeString() });
		}

		today.setDate(today.getDate() + 2);
		if (time(today, date)) {
			return m.tomorrow_time({ time: date.toLocaleTimeString() });
		}

		return date.toLocaleString();
	}

	return timeString;
}
