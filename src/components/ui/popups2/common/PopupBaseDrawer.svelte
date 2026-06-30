<script lang="ts">
	import { Drawer } from "diadem-vaul-svelte";
	import { getCurrentSelectedData, setCurrentSelectedData } from "$lib/mapObjects/currentSelectedState.svelte";
	import * as m from "$lib/paraglide/messages";
	import PopupButtons from "@/components/ui/popups/common/PopupButtons.svelte";
	import { backupShareUrl, canNativeShare, copyToClipboard, hasClipboardWrite } from "$lib/utils/device";
	import Button from "@/components/ui/input/Button.svelte";
	import { Copy, Navigation, Share2, X } from "lucide-svelte";
	import { getRootOrigin } from "$lib/native/runtime";
	import { getCurrentPath } from "$lib/mapObjects/interact";
	import { getLocale } from "$lib/paraglide/runtime";
	import { getMapsUrl } from "$lib/utils/mapUrl";
	import { Coords } from "$lib/utils/coordinates";
	import { getShareTitle } from "$lib/features/shareTexts";
	import PopupButton from "@/components/ui/popups/common/PopupButton.svelte";
	import PopupBaseStatic, { type MapObjectPopupProps } from "@/components/ui/popups2/common/PopupBaseStatic.svelte";
	import type { MapData } from "$lib/mapObjects/mapObjectTypes";

	let {
		open = $bindable(false),
		coords,
		props,
		data
	}: {
		open: boolean,
		coords: Coords,
		data: MapData | undefined
		props: MapObjectPopupProps | undefined
	} = $props();

	const snapPoints = ["250px", 1];
	let activeSnapPoint: number | string = $state(snapPoints[0]);
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
