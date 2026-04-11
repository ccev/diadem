<script lang="ts">
	import { closeMenu, getOpenedMenu, Menu, openMenu } from "@/lib/ui/menus.svelte.js";
	import MenuContainer from "@/components/menus/MenuContainer.svelte";
	import CloseButton from "@/components/ui/CloseButton.svelte";
	import { fly } from "svelte/transition";
	import * as m from "@/lib/paraglide/messages";
	import CoverageMapTitle from "@/components/menus/coverageMap/CoverageMapTitle.svelte";
</script>

<div
	class="mb-auto z-10 w-full overflow-y-auto h-fit rounded-br-xl pointer-events-auto pb-2 border border-border bg-card/60 backdrop-blur-sm"
	transition:fly={{ duration: 90, x: -120 }}
>
	<div
		class="w-full py-1 sticky top-[7px] flex items-center justify-between z-10 bg-card border border-b-border mt-2"
	>
		<h1 class="font-bold text-base tracking-tight mx-4">
			{m["nav_" + getOpenedMenu()]?.()}
		</h1>
		<CloseButton onclick={closeMenu} class="mr-2" />
	</div>

	<div class="px-2 mt-2">
		<MenuContainer />
	</div>
</div>
