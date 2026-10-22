<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import { ArrowLeft } from "@lucide/svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { getWayfarerInvokedFromMap } from "@/lib/features/wayfarerMap.svelte";
	import { goto } from "$app/navigation";
	import { closeMenu } from "@/lib/ui/menus.svelte";
	import { getMapPath } from "@/lib/utils/getMapPath";
</script>

<div
	class="pl-4 pr-2 py-2 flex flex-wrap gap-2 items-center justify-between bg-card rounded-lg border border-border"
>
	<h1 class="font-semibold">Wayfarer Map</h1>

	{#if getConfig().general.customHome && !getWayfarerInvokedFromMap()}
		<Button size="sm" variant="outline" tag="a" href="/" onclick={() => closeMenu()}>
			<ArrowLeft class="size-4" />
			<span>Back to site</span>
		</Button>
	{:else}
		<Button
			size="sm"
			variant="outline"
			onclick={() => {
				goto(getMapPath(getConfig()));
			}}
		>
			<ArrowLeft class="size-4" />
			<span>Back to map</span>
		</Button>
	{/if}
</div>
