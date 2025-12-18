<script lang="ts">
	import Button from '@/components/ui/input/Button.svelte';
	import { clearMap } from '@/lib/mapObjects/updateMapObject';
	import { isSupportedFeature, updateSupportedFeatures } from "@/lib/services/supportedFeatures";
	import { goto } from '$app/navigation';
	import { getLoginLink } from '@/lib/services/user/login';
	import { updateUserDetails } from '@/lib/services/user/userDetails.svelte';
	import { getConfig } from '@/lib/services/config/config';

	let {
		isLoggingOut = $bindable(),
		children,
		...rest
	} = $props()

	async function logout() {
		isLoggingOut = true
		await fetch('/logout');
		// TODO: Error handling
		clearMap()
		await Promise.all([
			updateSupportedFeatures(),
			updateUserDetails()
		])

		if (isSupportedFeature("authRequired")) {
			if (getConfig().general.customHome) {
				await goto("/")
			} else {
				await goto(getLoginLink())
			}
		}
		isLoggingOut = false
	}
</script>

<Button onclick={logout} {...rest}>
	{@render children?.()}
</Button>