import * as m from "@/lib/paraglide/messages";
import { getConfig } from "@/lib/services/config/config";
import { openToast } from "@/lib/ui/toasts.svelte.js";
import { getMapPath } from "@/lib/utils/getMapPath";
import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = (event) => {
	if (event.data.error) {
		openToast(m.signin_toast_error(), 10000);
	} else {
		openToast(m.signin_toast_success({ name: event.data.name ?? "" }), 10000);
	}

	return redirect(302, event.data.redir ?? getMapPath(getConfig()));
};
