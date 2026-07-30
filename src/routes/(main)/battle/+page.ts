import { error } from "@sveltejs/kit";
import type { AvailableBoss } from "$lib/features/autoBattle";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
	const response = await fetch("/api/auto-battle/available");
	if (!response.ok) error(response.status, "Unable to load available battles");

	return (await response.json()) as { bosses: AvailableBoss[] };
};
