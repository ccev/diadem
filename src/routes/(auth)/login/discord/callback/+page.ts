import type { PageLoad } from './$types';
import { openToast } from '@/lib/ui/toasts.svelte.js';
import { redirect } from '@sveltejs/kit';
import * as m from '@/lib/paraglide/messages';
import { getMapPath } from "@/lib/utils/getMapPath";
import { getConfig } from "@/lib/services/config/config";

export const load: PageLoad = (event) => {
	if (event.data.error) {
		openToast(m.signin_toast_error(), 10000);
	} else {
		openToast(m.signin_toast_success({ name: event.data.name ?? "" }), 10000);
	}

	return redirect(302, event.data.redir ?? getMapPath(getConfig()));
};
