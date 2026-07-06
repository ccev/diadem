import * as m from "@/lib/paraglide/messages";
import { time } from "@/lib/utils/time";
import { getLocale } from "$lib/paraglide/runtime";

export type LocalTimeOptions = {
	showDate?: boolean;
	showSeconds?: boolean;
	showTime?: boolean;
	longMonth?: boolean;
	dayLowerCase?: boolean;
}

export function timestampToLocalTime(
	timestamp: number | null | undefined,
	options: LocalTimeOptions | undefined = undefined
) {
	if (!timestamp) return "";
	const {
		showDate = false,
		showSeconds = true,
		showTime = true,
		longMonth = false,
		dayLowerCase = true
	} = options ?? {};

	const date = new Date(timestamp * 1000);

	const params: Intl.DateTimeFormatOptions = {};

	if (showTime) {
		params.hour = "2-digit";
		params.minute = "2-digit";
	}
	if (showSeconds) {
		params.second = "2-digit";
	}

	const timeString = date.toLocaleTimeString(getLocale(), params);

	if (showDate) {
		const today = new Date();

		if (time(today, date)) {
			return dayLowerCase
				? m.today_time_lower({ time: timeString })
				: m.today_time({ time: timeString });
		}

		today.setDate(today.getDate() - 1);
		if (time(today, date)) {
			return dayLowerCase
				? m.yesterday_time_lower({ time: timeString })
				: m.yesterday_time({ time: timeString });
		}

		today.setDate(today.getDate() + 2);
		if (time(today, date)) {
			return dayLowerCase
				? m.tomorrow_time_lower({ time: timeString })
				: m.tomorrow_time({ time: timeString });
		}

		const dateParams: Intl.DateTimeFormatOptions = {
			...params,
			day: "numeric",
			month: "short"
		};
		if (date.getFullYear() !== today.getFullYear()) {
			dateParams.year = "numeric";
		}
		if (longMonth) {
			dateParams.month = "long";
		}

		return date.toLocaleString(getLocale(), dateParams);
	}

	return timeString;
}
