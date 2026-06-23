<script lang="ts">
	import ErrorPage from "@/components/ui/ErrorPage.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { Unplug } from "lucide-svelte";
	import { getInstanceUrl, isInstanceUrlBaked, isNative, setInstanceUrl } from "@/lib/native/runtime";
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
		window.location.reload();
	}
</script>

<ErrorPage error={title} {description} href="" linkLabel="">
	{#snippet extraButtons()}
		<Button onclick={retry} disabled={retrying}>
			{retrying ? m.connecting() : m.error_retry()}
		</Button>
		{#if canDisconnect}
			<Button variant="ghost" onclick={disconnect} disabled={disconnecting}>
				<Unplug class="size-3.5" />
				{m.disconnect_from_name({ name: getConfig()?.general?.mapName || getInstanceUrl() || m.diadem_map() })}
			</Button>
		{/if}
	{/snippet}
</ErrorPage>
