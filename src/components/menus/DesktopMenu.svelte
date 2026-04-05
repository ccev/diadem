<script lang="ts">
	import { closeMenu, getOpenedMenu, openMenu } from "@/lib/ui/menus.svelte.js";
	import MenuContainer from "@/components/menus/MenuContainer.svelte";
	import CloseButton from "@/components/ui/CloseButton.svelte";
	import { fly } from "svelte/transition";
	import * as m from "@/lib/paraglide/messages";
	import { closeCoverageMap, getIsCoverageMapActive } from "@/lib/features/coverageMap.svelte";
	import CoverageMapTitle from "@/components/menus/coverageMap/CoverageMapTitle.svelte";
</script>

<div
	class="mb-auto z-10 w-full overflow-y-auto h-fit rounded-br-xl pointer-events-auto pb-2 border border-border bg-card/60 backdrop-blur-sm"
	transition:fly={{ duration: 90, x: -120 }}
>
	{#if getIsCoverageMapActive()}
		<div class="w-full pt-1 pb-2 px-2 sticky top-[7px] flex items-center justify-between z-10">
			<CoverageMapTitle />
		</div>
	{:else}
		<div
			class="w-full py-1 sticky top-[7px] flex items-center justify-between z-10 bg-card border border-b-border mt-2"
		>
			<h1 class="font-bold text-base tracking-tight mx-4">
				{m["nav_" + getOpenedMenu()]()}
			</h1>
			<CloseButton
				onclick={() => {
					if (getIsCoverageMapActive()) {
						closeCoverageMap();
					} else {
						closeMenu();
					}
				}}
				class="mr-2"
			/>
		</div>
	{/if}

	<div class="px-2 mt-2">
		<MenuContainer />
	</div>
</div>
