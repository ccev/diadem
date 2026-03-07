<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import { goto } from "$app/navigation";
	import { clearMap } from "@/lib/mapObjects/updateMapObject";
	import { getConfig } from "@/lib/services/config/config";
	import { isSupportedFeature, updateSupportedFeatures } from "@/lib/services/supportedFeatures";
	import { getLoginLink } from "@/lib/services/user/login";
	import { updateUserDetails } from "@/lib/services/user/userDetails.svelte";
	import { openToast } from "@/lib/ui/toasts.svelte.js";

	let { isLoggingOut = $bindable(), children, ...rest } = $props();

	async function logout() {
		isLoggingOut = true;
		try {
			const response = await fetch("/logout", { method: "POST" });
			if (!response.ok) {
				openToast("Error while signing out, please try again", 10000);
				return;
			}

			clearMap();
			await Promise.all([updateSupportedFeatures(), updateUserDetails()]);

			// Only redirect after logout when the app requires auth to keep using the current view.
			if (isSupportedFeature("authRequired")) {
				if (getConfig().general.customHome) {
					await goto("/");
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
