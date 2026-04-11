<script lang="ts">
	import { m } from "@/lib/paraglide/messages";
	import Button from "@/components/ui/input/Button.svelte";
	import { ArrowLeft } from "lucide-svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { getCoverageMapInvokedFromMap } from "@/lib/features/coverageMap.svelte";
	import { goto } from "$app/navigation";
	import { closeMenu } from "@/lib/ui/menus.svelte";
</script>

<div
	class="w-full pl-4 pr-2 py-2 flex items-center justify-between bg-card rounded-lg border border-border"
>
	<h1 class="font-semibold">
		{m.nav_coveragemap()}
	</h1>

	{#if getConfig().general.customHome && !getCoverageMapInvokedFromMap()}
		<Button size="sm" variant="outline" tag="a" href="/" onclick={() => closeMenu()}>
			<ArrowLeft class="size-4" />
			<span>{m.error_back_to_website()}</span>
		</Button>
	{:else}
		<Button
			size="sm"
			variant="outline"
			onclick={() => {
				closeMenu();
				goto("/map");
			}}
		>
			<ArrowLeft class="size-4" />
			<span>{m.back_to_map()}</span>
		</Button>
	{/if}
</div>
