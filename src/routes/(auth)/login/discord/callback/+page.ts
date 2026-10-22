import { getConfig } from "@/lib/services/config/config";
import { openToast } from "@/lib/ui/toasts.svelte.js";
import { getMapPath } from "@/lib/utils/getMapPath";
import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = (event) => {
	if (event.data.error) {
		openToast("Error while signing in, please try again", 10000);
	} else {
		openToast(`Signed in as ${event.data.name ?? ""}`, 10000);
	}

	return redirect(302, event.data.redir ?? getMapPath(getConfig()));
};
