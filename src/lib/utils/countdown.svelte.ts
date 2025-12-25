import { currentTimestamp } from '@/lib/utils/currentTimestamp';
import * as m from "@/lib/paraglide/messages";
import { SvelteMap } from "svelte/reactivity";

let countdowns = new Map<symbol, {
    expireTime: number | null | undefined;
    showHours: boolean;
}>();

let formattedTimes: { [key: symbol]: string } = $state({})

let interval: NodeJS.Timeout | undefined;

export function getCountdownString(id: symbol | undefined) {
	if (id === undefined) return ""
	return formattedTimes[id] ?? ""
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
            const hours = Math.floor((absRemainingTime % (3600 * 24) ) / 3600);
            if (isPast) {
                formattedTimeValue = m.time_format_d_h_m_ago({d: days, h: hours, m: minutes});
            } else {
                formattedTimeValue = m.time_format_d_h_m({d: days, h: hours, m: minutes});
            }
        } else if (countdown.showHours || absRemainingTime >= 60 * 60) {
            const hours = Math.floor(absRemainingTime / 3600);
            if (absRemainingTime >= 60 * 60) {
                if (isPast) {
                    formattedTimeValue = m.time_format_h_m_ago({h: hours, m: minutes, s: seconds});
                } else {
                    formattedTimeValue = m.time_format_h_m({h: hours, m: minutes, s: seconds});
                }
            } else {
                if (isPast) {
                    formattedTimeValue = m.time_format_h_m_s_ago({h: hours, m: minutes, s: seconds});
                } else {
                    formattedTimeValue = m.time_format_h_m_s({h: hours, m: minutes, s: seconds});
                }
            }
        } else {
            minutes = Math.floor(absRemainingTime / 60);
            if (isPast) {
                formattedTimeValue = m.time_format_m_s_ago({m: minutes, s: seconds});
            } else {
                formattedTimeValue = m.time_format_m_s({m: minutes, s: seconds});
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
	updateAllCountdowns()
	startOrStopInterval();
	return id
}

export function stopCountdown(id: symbol) {
	countdowns.delete(id);
	delete formattedTimes[id]
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
