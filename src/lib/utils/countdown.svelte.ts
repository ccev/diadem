import { currentTimestamp } from "@/lib/utils/currentTimestamp";

let countdowns = new Map<
	symbol,
	{
		expireTime: number | null | undefined;
		showHours: boolean;
	}
>();

let formattedTimes: { [key: symbol]: string } = $state({});

let interval: NodeJS.Timeout | undefined;

export function getCountdownString(id: symbol | undefined) {
	if (id === undefined) return "";
	return formattedTimes[id] ?? "";
}

function updateAllCountdowns() {
	const now = currentTimestamp();
	for (const [id, countdown] of countdowns) {
		const remainingTime = (countdown.expireTime ?? 0) - now;
		const isPast = remainingTime < 0;
		const absRemainingTime = Math.abs(remainingTime);

		const seconds = absRemainingTime % 60;
		let minutes = Math.floor((absRemainingTime % 3600) / 60);
		let formattedTimeValue = "";

		if (absRemainingTime >= 60 * 60 * 24) {
			const days = Math.floor(absRemainingTime / (3600 * 24));
			const hours = Math.floor((absRemainingTime % (3600 * 24)) / 3600);
			if (isPast) {
				formattedTimeValue = `${days}d ${hours}h ${minutes}m ago`;
			} else {
				formattedTimeValue = /* @wc-include */ `${days}d ${hours}h ${minutes}m`;
			}
		} else if (countdown.showHours || absRemainingTime >= 60 * 60) {
			const hours = Math.floor(absRemainingTime / 3600);
			if (absRemainingTime >= 60 * 60) {
				if (isPast) {
					formattedTimeValue = `${hours}h ${minutes}m ago`;
				} else {
					formattedTimeValue = /* @wc-include */ `${hours}h ${minutes}m`;
				}
			} else {
				if (isPast) {
					formattedTimeValue = `${hours}h ${minutes}m ${seconds}s ago`;
				} else {
					formattedTimeValue = /* @wc-include */ `${hours}h ${minutes}m ${seconds}s`;
				}
			}
		} else {
			minutes = Math.floor(absRemainingTime / 60);
			if (isPast) {
				formattedTimeValue = `${minutes}m ${seconds}s ago`;
			} else {
				formattedTimeValue = /* @wc-include */ `${minutes}m ${seconds}s`;
			}
		}

		formattedTimes[id] = formattedTimeValue.replaceAll(" ", "\u00A0");
	}
}

export function startCountdown(expireTime: number | null | undefined, showHours = false) {
	const id = Symbol();
	const countdownData = {
		expireTime,
		showHours,
		formattedTime: ""
	};
	countdowns.set(id, countdownData);
	updateAllCountdowns();
	startOrStopInterval();
	return id;
}

export function stopCountdown(id: symbol) {
	countdowns.delete(id);
	delete formattedTimes[id];
	startOrStopInterval();
}

function startOrStopInterval() {
	if (countdowns.size > 0 && !interval) {
		interval = setInterval(updateAllCountdowns, 1000);
	} else if (countdowns.size === 0 && interval) {
		clearInterval(interval);
		interval = undefined;
	}
}
