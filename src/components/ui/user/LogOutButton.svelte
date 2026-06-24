<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import { goto } from "$app/navigation";
	import { clearMap } from "@/lib/mapObjects/updateMapObject";
	import { getConfig } from "@/lib/services/config/config";
	import { isSupportedFeature, updateSupportedFeatures } from "@/lib/services/supportedFeatures";
	import { getLoginLink, startLogin } from "@/lib/services/user/login";
	import { updateUserDetails } from "@/lib/services/user/userDetails.svelte";
	import { isNative } from "@/lib/native/runtime";
	import { nativeLogout } from "@/lib/native/auth";
	import { openToast } from "@/lib/ui/toasts.svelte.js";
	import * as m from "@/lib/paraglide/messages";

	let { isLoggingOut = $bindable(), children, ...rest } = $props();

	async function logout() {
		isLoggingOut = true;
		try {
			if (isNative()) {
				// Native has no cookies and can't reach the web /logout route; sign out
				// via the bearer-authenticated API and clear the stored token.
				await nativeLogout();
			} else {
				const response = await fetch("/logout", { method: "POST" });
				if (!response.ok) {
					openToast(m.signout_toast_error(), 10000);
					return;
				}
			}

			clearMap();
			await Promise.all([updateSupportedFeatures(), updateUserDetails()]);

			// Only redirect after logout when the app requires auth to keep using the current view.
			if (isSupportedFeature("authRequired")) {
				if (getConfig().general.customHome) {
					await goto("/");
				} else if (isNative()) {
					// /login/discord is a server route the static app can't navigate to;
					// start the native (system-browser) login flow instead.
					await startLogin();
				} else {
					await goto(getLoginLink());
				}
			}
		} finally {
			isLoggingOut = false;
		}
	}
</script>

<Button onclick={logout} {...rest}>
	{@render children?.()}
</Button>
