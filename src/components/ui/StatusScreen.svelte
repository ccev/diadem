<script lang="ts">
	import ErrorPage from "@/components/ui/ErrorPage.svelte";
	import Button from "@/components/ui/input/Button.svelte";

	import { Unplug } from "@lucide/svelte";
	import {
		getInstanceUrl,
		isInstanceUrlBaked,
		isNative,
		setInstanceUrl
	} from "@/lib/native/runtime";
	import { clearStoredToken } from "@/lib/native/auth";
	import { getConfig } from "$lib/services/config/config";

	let { title, description }: { title: string; description?: string } = $props();

	const canDisconnect = isNative() && !isInstanceUrlBaked();

	let retrying = $state(false);
	function retry() {
		retrying = true;
		window.location.assign("/");
	}

	let disconnecting = $state(false);
	async function disconnect() {
		disconnecting = true;
		await clearStoredToken();
		await setInstanceUrl("");
		window.location.assign("/");
	}
</script>

<ErrorPage error={title} {description} href="" linkLabel="">
	{#snippet extraButtons()}
		<Button onclick={retry} disabled={retrying}>
			{retrying ? "Connecting" : "Retry"}
		</Button>
		{#if canDisconnect}
			<Button variant="ghost" onclick={disconnect} disabled={disconnecting}>
				<Unplug class="size-3.5" />
				Disconnect from {getConfig()?.general?.mapName || getInstanceUrl() || "Diadem Map"}
			</Button>
		{/if}
	{/snippet}
</ErrorPage>
