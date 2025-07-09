<script lang="ts">
	import { slide } from 'svelte/transition';
	import { getOpenedMenu, openMenu } from '@/lib/menus.svelte';
	import MenuContainer from '@/components/menus/MenuContainer.svelte';
	import CloseButton from '@/components/ui/CloseButton.svelte';
	import * as m from '@/lib/paraglide/messages';

	let currentTouches: { [key: string]: { initialY: number, lastY: number, cancels: boolean } } = {};
	let translate = $state(0);
	let container: HTMLDivElement | undefined = $state(undefined)

	// $effect(() => {
	// 	if (!container) return
	// 	console.debug("container " + container.scrollHeight + " / " + container.clientHeight)
	// 	if (container.scrollHeight <= container.clientHeight) {
	// 		container.style.display = "flex"
	// 	} else {
	// 		container.style.display = "block"
	// 	}
	// })

	function ontouchstart(event: TouchEvent) {
		if (event.currentTarget?.scrollTop > 0) return;

		for (const touch of event.targetTouches) {
			currentTouches[touch.identifier] = { initialY: touch.clientY, lastY: touch.clientY, cancels: false };
		}
	}

	function ontouchmove(event: TouchEvent) {
		let biggestDiff = 0;
		for (const touch of event.targetTouches) {
			if (!Object.hasOwn(currentTouches, touch.identifier)) continue;

			const currentTouch = currentTouches[touch.identifier]

			const thisDiff = touch.clientY - currentTouch.initialY;
			if (thisDiff > biggestDiff) {
				biggestDiff = thisDiff;
				currentTouch.cancels = true;
			} else {
				currentTouch.cancels = false;
			}

			// When pulling down, but then swiping up again, don't cancel
			const changeSinceLast = touch.clientY - currentTouch.lastY
			currentTouch.lastY = touch.clientY
			if (changeSinceLast < 0) currentTouch.cancels = false
		}
		if (biggestDiff > 0) translate = biggestDiff;
	}

	function ontouchcancel(event: TouchEvent) {
		translate = 0;
		if (Object.values(currentTouches).find(v => v.cancels)) {
			openMenu(null);
		}
	}
</script>

<div
	bind:this={container}
	class="fixed z-10 w-full h-full bottom-0 overflow-y-auto pointer-events-none flex-col justify-end"
	transition:slide={{ duration: 70, axis: "y" }}
	{ontouchstart}
	{ontouchmove}
	{ontouchcancel}
	ontouchend={ontouchcancel}
>
	<div
		class="pb-20 px-2 pt-2 mt-40 min-h-full rounded-t-xl border border-t-border bg-card/60 backdrop-blur-sm pointer-events-auto"
		style="transform: translateY({translate}px)"
	>
		<div class="w-full py-1 sticky top-2 flex items-center justify-between z-10 bg-card/60 backdrop-blur-sm rounded-lg border border-border">
			<h1 class="font-bold text-base tracking-tight mx-4">
				{m["nav_" + getOpenedMenu()]()}
			</h1>
			<CloseButton
				onclick={() => openMenu(null)}
				class="mr-1 hover:bg-accent/90! active:bg-accent/90!"
			/>
		</div>

		<MenuContainer />
	</div>
</div>
