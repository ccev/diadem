<script module lang="ts">
	import { SvelteSet } from "svelte/reactivity";

	type SnapPoint = string | number;
	type ResetDrawerSnapPoint = () => void;

	const resetPopupBaseDrawerSnapPointCallbacks = new SvelteSet<ResetDrawerSnapPoint>();

	export function resetPopupBaseDrawerSnapPoint() {
		for (const reset of resetPopupBaseDrawerSnapPointCallbacks) {
			reset();
		}
	}
</script>

<script lang="ts">
	import { onDestroy, untrack } from "svelte";
	import { Drawer } from "diadem-vaul-svelte";
	import { setCurrentSelectedData } from "$lib/mapObjects/currentSelectedState.svelte";
	import type { Coords } from "$lib/utils/coordinates";
	import PopupBaseStatic, { type MapObjectPopupProps } from "@/components/ui/popups2/common/PopupBaseStatic.svelte";
	import type { MapData } from "$lib/mapObjects/mapObjectTypes";

	let {
		open = $bindable(false),
		coords,
		props,
		data,
		initialSnapPoint = "250px"
	}: {
		open: boolean,
		coords: Coords,
		data: MapData | undefined
		props: MapObjectPopupProps | undefined,
		initialSnapPoint?: SnapPoint
	} = $props();

	let snapPoints: SnapPoint[] = $derived([initialSnapPoint, 1]);
	let activeSnapPoint: SnapPoint = $state(untrack(() => initialSnapPoint));

	function resetActiveSnapPoint() {
		activeSnapPoint = snapPoints[0];
	}

	resetPopupBaseDrawerSnapPointCallbacks.add(resetActiveSnapPoint);
	onDestroy(() => resetPopupBaseDrawerSnapPointCallbacks.delete(resetActiveSnapPoint));
</script>

<Drawer.Root
	{open}
	onRelease={(_, open) => {
		if (!open) setCurrentSelectedData(null);
	}}
	closeOnOutsideClick={false}
	{snapPoints}
	bind:activeSnapPoint
>
	<Drawer.Portal>
		<Drawer.Content
			class="duration-150! fixed flex flex-col bottom-0 z-50 w-full h-full rounded-t-xl border border-t-border bg-card pb-[env(safe-area-inset-bottom)] mt-safe-inset-top"
		>
			<div class="w-10 mx-auto my-3 rounded-full bg-ring h-1 shrink-0"></div>
			<PopupBaseStatic
				{coords}
				{data}
				{props}
				onlyShowNavigationButton={activeSnapPoint === 1}
			/>
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>
