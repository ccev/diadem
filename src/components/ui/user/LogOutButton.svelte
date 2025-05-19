<script lang="ts">
	import Button from '@/components/ui/basic/Button.svelte';
	import { clearMap } from '@/lib/mapObjects/updateMapObject';
	import { isSupportedFeature } from '@/lib/enabledFeatures';
	import { goto } from '$app/navigation';
	import { getLoginLink } from '@/lib/user/login';
	import { updateUserDetails } from '@/lib/user/userDetails.svelte';

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

		if (isSupportedFeature("authRequired")) {
			await goto(getLoginLink())
		} else {
			await updateUserDetails();
		}
		isLoggingOut = false
	}
</script>

<Button onclick={logout} {...rest}>
	{@render children?.()}
</Button>