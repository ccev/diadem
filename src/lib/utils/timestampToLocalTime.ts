import * as m from "@/lib/paraglide/messages";
import { time } from "@/lib/utils/time";
import { getLocale } from "$lib/paraglide/runtime";

export function timestampToLocalTime(
	timestamp: number | null | undefined,
	showDate: boolean = false,
	showSeconds: boolean = true,
	options: {
		showTime?: boolean
	} | undefined = undefined
) {
	if (!timestamp) return "";

	const date = new Date(timestamp * 1000);

	const params: Intl.DateTimeFormatOptions = {}

	if (options?.showTime ?? true) {
		params.hour = "2-digit"
		params.minute = "2-digit"
	}
	if (showSeconds) {
		params.second = "2-digit";
	}

	const timeString = date.toLocaleTimeString(getLocale(), params);

	if (showDate) {
		const today = new Date();

		if (time(today, date)) {
			return m.today_time({ time: timeString });
		}

		today.setDate(today.getDate() - 1);
		if (time(today, date)) {
			return m.yesterday_time({ time: timeString });
		}

		today.setDate(today.getDate() + 2);
		if (time(today, date)) {
			return m.tomorrow_time({ time: timeString });
		}

		return date.toLocaleString(getLocale(), {
			...params,
			day: "numeric",
			month: "short",
			year: "numeric"
		});
	}

	return timeString;
}
