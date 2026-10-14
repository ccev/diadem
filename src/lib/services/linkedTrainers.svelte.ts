import { isLinkPending } from "@/lib/features/linkedTrainerStatus";
import { encodeRequestBody, getHeaders, parseResponse } from "@/lib/utils/requests";
import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
import {
	onlyLinkedTrainerId,
	pinUnchosenFiltersets
} from "@/lib/features/filters/personalShinyPin";

export type LinkedTrainerInfo = {
	id: string;
	status: string;
	trainerName?: string;
};

export type LinkTrainerError =
	| "invalid_friend_code"
	| "too_many_trainers"
	| "queue_full"
	| "rate_limited"
	| "unavailable"
	| "not_allowed"
	| "invalid_body";

const ENDPOINT = "/api/user/trainers";

let trainers: LinkedTrainerInfo[] = $state([]);

export function getLinkedTrainers() {
	return trainers;
}

export function isTrainerPending(trainer: LinkedTrainerInfo) {
	return isLinkPending(trainer.status);
}

/** Trainers that finished linking (the ones a filterset can be limited to). */
export function getCompleteTrainers() {
	return trainers.filter((trainer) => trainer.status === "complete");
}

// While the user has exactly one trainer, "not chosen" and "that trainer" mean the same thing.
// Pin them now, so linking a second trainer later doesn't widen these filtersets to both.
function pinSavedFiltersetsToOnlyTrainer() {
	const trainerId = onlyLinkedTrainerId(trainers);
	if (!trainerId) return;
	const filtersets = getUserSettings()?.filters?.pokemon?.filters;
	if (!filtersets) return;
	if (pinUnchosenFiltersets(filtersets, trainerId) > 0) updateUserSettings();
}

export async function refreshLinkedTrainers() {
	const response = await fetch(ENDPOINT, { headers: getHeaders() });
	if (!response.ok) return;
	const data = await parseResponse<{ result: LinkedTrainerInfo[] }>(response);
	trainers = data.result ?? [];
	pinSavedFiltersetsToOnlyTrainer();
}

export async function linkTrainer(friendCode: string): Promise<LinkTrainerError | undefined> {
	const { body, contentType } = encodeRequestBody({ friendCode });
	const response = await fetch(ENDPOINT, {
		method: "POST",
		body,
		headers: getHeaders(contentType)
	});
	const data = await parseResponse<{ error: LinkTrainerError | null; result?: LinkedTrainerInfo }>(
		response
	).catch(() => ({ error: "unavailable" as const, result: undefined }));

	if (!response.ok || data.error) return data.error ?? "unavailable";
	if (data.result) trainers = [...trainers, data.result];
}

export async function unlinkTrainer(id: string) {
	const response = await fetch(`${ENDPOINT}/${encodeURIComponent(id)}`, {
		method: "DELETE",
		headers: getHeaders()
	});
	if (response.ok) trainers = trainers.filter((trainer) => trainer.id !== id);
	return response.ok;
}
