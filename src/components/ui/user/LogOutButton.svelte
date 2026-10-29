<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import { isNative } from "@/lib/native/runtime";
	import { applySignedOut } from "@/lib/services/user/signedOut";
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

			await applySignedOut();
		} finally {
			isLoggingOut = false;
		}
	}
</script>

<Button onclick={logout} {...rest}>
	{@render children?.()}
</Button>
