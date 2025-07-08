<script lang="ts">
	import { slide } from 'svelte/transition';
	import { getOpenedMenu, openMenu } from '@/lib/menus.svelte';
	import MenuContainer from '@/components/menus/MenuContainer.svelte';
	import CloseButton from '@/components/ui/CloseButton.svelte';

	let currentTouches: { [key: string]: { y: number, cancels: boolean } } = {};
	let translate = $state(0);

	function ontouchstart(event: TouchEvent) {
		if (event.currentTarget.scrollTop > 0) return;

		for (const touch of event.targetTouches) {
			currentTouches[touch.identifier] = { y: touch.clientY, cancels: false };
		}
	}

	function ontouchmove(event: TouchEvent) {
		let biggestDiff = 0;
		for (const touch of event.targetTouches) {
			if (!Object.hasOwn(currentTouches, touch.identifier)) continue;

			const thisDiff = touch.clientY - currentTouches[touch.identifier].y;
			if (thisDiff > biggestDiff) {
				biggestDiff = thisDiff;
				currentTouches[touch.identifier].cancels = true;
			} else {
				currentTouches[touch.identifier].cancels = false;
			}
		}
		// console.debug(biggestDiff)
		if (biggestDiff > 0) translate = biggestDiff;
	}

	function ontouchcancel(event: TouchEvent) {
		if (Object.values(currentTouches).find(v => v.cancels)) {
			translate = 0;
			openMenu(null);
		}
	}
</script>

<div
	class="fixed z-10 w-full h-full bottom-0 overflow-y-auto pointer-events-none"
	transition:slide={{ duration: 70, axis: "y" }}
	{ontouchstart}
	{ontouchmove}
	{ontouchcancel}
	ontouchend={ontouchcancel}
>

	<div
		class="pb-20 px-2 pt-2 rounded-t-xl border border-t-border bg-card/60 backdrop-blur-sm pointer-events-auto"
		style="margin-top: calc(168px + {translate}px)"
	>
		<div class="w-full py-1 sticky top-2 flex items-center justify-between z-10 bg-card/60 backdrop-blur-sm rounded-lg border border-border">
			<h1 class="font-bold text-base tracking-tight mx-4">
				Profile
			</h1>
			<CloseButton
				onclick={() => openMenu(null)}
				class="mr-1 hover:bg-accent/90! active:bg-accent/90!"
			/>
		</div>

		<MenuContainer />
	</div>
</div>