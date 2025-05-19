import type { PageLoad } from './$types';
import { openToast } from '@/components/ui/toast/toastUtils.svelte';
import { redirect } from '@sveltejs/kit';
import * as m from '@/lib/paraglide/messages';

export const load: PageLoad = (event) => {
	if (event.data.error) {
		openToast(m.signin_toast_error(), 10000);
	} else {
		openToast(m.signin_toast_success({ name: event.data.name }), 10000);
	}

	return redirect(302, event.data.redir ?? '/');
};
