<script lang="ts">
	import { m } from "@/lib/paraglide/messages";
	import RedirectFlash from "@/components/ui/RedirectFlash.svelte";
	import { onMount } from "svelte";
	import { getIsLoading } from "@/lib/services/initialLoad.svelte.js";
	import { openCoverageMap } from "@/lib/features/coverageMap.svelte.js";
	import { goto } from "$app/navigation";
	import { getMapPath } from "@/lib/utils/getMapPath";
	import { getConfig } from "@/lib/services/config/config";

	let onRoot = false;

	onMount(() => {
		onRoot = !location.pathname.startsWith(getMapPath(getConfig()));
		goto(getMapPath(getConfig()), { replaceState: true }).then(() => openCoverageMap(onRoot));
	});
</script>

{#if getIsLoading()}
	<RedirectFlash
		goal={m.nav_coveragemap()}
		redirect={false}
		href={getMapPath(getConfig())}
		onclick={() => openCoverageMap(onRoot)}
	/>
{/if}
