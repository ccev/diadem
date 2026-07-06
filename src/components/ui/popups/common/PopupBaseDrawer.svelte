<script module lang="ts">
	type SnapPoint = string | number;
</script>

<script lang="ts">
	import { onDestroy, tick, untrack } from "svelte";
	import { Drawer } from "diadem-vaul-svelte";
	import { watch } from "runed";
	import { closePopup } from "$lib/mapObjects/interact";
	import { bindPopupDrawerSnapPoint } from "$lib/ui/popupDrawer.svelte";
	import type { Coords } from "$lib/utils/coordinates";
	import PopupBaseStatic, { type MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import type { MapData } from "$lib/mapObjects/mapObjectTypes";

	let {
		open = $bindable(false),
		coords,
		props,
		data,
	}: {
		open: boolean,
		coords: Coords,
		data: MapData | undefined
		props: MapObjectPopupProps | undefined,
	} = $props();

	let initialSnapPoint: SnapPoint = $state("250px");

	let snapPoints: SnapPoint[] = $derived([initialSnapPoint, 1]);
	let activeSnapPoint: SnapPoint = $state(untrack(() => initialSnapPoint));

	function updateInitialSnapPoint() {
		if (typeof document === "undefined") return;

		const drawerElement = document.querySelector<HTMLElement>("[data-vaul-drawer]");
		const endElement = drawerElement?.querySelector<HTMLElement>("[data-popup-initial-snap-point-end]");
		if (!(drawerElement instanceof HTMLElement) || !endElement) return;

		const distance = endElement.getBoundingClientRect().bottom - drawerElement.getBoundingClientRect().top;
		if (distance <= 0) return;

		const nextSnapPoint = `${Math.ceil(distance + 16)}px`;
		const wasAtInitialSnapPoint = activeSnapPoint === initialSnapPoint;

		initialSnapPoint = nextSnapPoint;

		if (wasAtInitialSnapPoint || activeSnapPoint !== 1) {
			tick().then(() => {
				activeSnapPoint = nextSnapPoint;
			})
		}
	}

	watch(
		() => [data, props, open],
		() => {
			if (!open) return;

			tick().then(() => {
				updateInitialSnapPoint();
			});
		}
	);

	function isActiveSnapPointExpanded() {
		if (activeSnapPoint === 1) return true;
		if (typeof document === "undefined") return false;

		const drawerElement = document.querySelector<HTMLElement>("[data-vaul-drawer]");
		return Boolean(drawerElement && Math.abs(drawerElement.getBoundingClientRect().top) <= 1);
	}

	const unbindPopupDrawerSnapPoint = bindPopupDrawerSnapPoint({
		getActiveSnapPoint: () => activeSnapPoint,
		setActiveSnapPoint: (snapPoint) => (activeSnapPoint = snapPoint),
		getInitialSnapPoint: () => snapPoints[0],
		isExpanded: isActiveSnapPointExpanded
	});
	onDestroy(unbindPopupDrawerSnapPoint);
</script>

<Drawer.Root
	{open}
	onRelease={(_, open) => {
		if (!open) closePopup();
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
