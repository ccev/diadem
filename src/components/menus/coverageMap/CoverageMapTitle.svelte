<script lang="ts">
	import { m } from "@/lib/paraglide/messages";
	import { closeMenu } from "@/lib/ui/menus.svelte";
	import CloseButton from "@/components/ui/CloseButton.svelte";
	import { closeCoverageMap, getClickedCoverageMapAreas } from "@/lib/features/coverageMap.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import { ArrowLeft } from "lucide-svelte";
	import { slide, fade, fly } from "svelte/transition";
	import Card from "@/components/ui/Card.svelte";
	import { flip } from "svelte/animate";
	import { getConfig } from "@/lib/services/config/config";
	import { getMapPath } from "@/lib/utils/getMapPath";
	import { SvelteURL } from "svelte/reactivity";
	import { onMount } from "svelte";
</script>

<div
	class="w-full pl-4 pr-2 py-2 flex items-center justify-between bg-card rounded-lg border border-border"
>
	<h1 class="font-semibold">
		{m.nav_coveragemap()}
	</h1>

	{#if getConfig().general.customHome && !location.pathname.startsWith(getMapPath(getConfig()))}
		<Button size="sm" variant="outline" tag="a" href="/" onclick={closeCoverageMap}>
			<ArrowLeft class="size-4" />
			<span>{m.error_back_to_website()}</span>
		</Button>
	{:else}
		<Button size="sm" variant="outline" onclick={closeCoverageMap}>
			<ArrowLeft class="size-4" />
			<span>{m.back_to_map()}</span>
		</Button>
	{/if}
</div>
