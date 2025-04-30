<script lang="ts">
	import { ContextMenu } from "bits-ui"
	import { fly } from "svelte/transition"
	import maplibre from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { getContextMenuEvent } from '@/components/ui/contextmenu/utils.svelte';
	import { Binoculars, Clipboard, Navigation } from 'lucide-svelte';
	import Button from '@/components/ui/Button.svelte';
	import ContextMenuItem from '@/components/ui/contextmenu/ContextMenuItem.svelte';
	import { canNativeShare, copyToClipboard, getMapsUrl, hasClipboardWrite } from '@/lib/utils.svelte';
	import { openToast } from '@/components/ui/toast/toastUtils.svelte';
	import { getUserSettings } from '@/lib/userSettings.svelte';
	import * as m from "@/lib/paraglide/messages"
	import { isUiLeft } from '@/lib/deviceCheck';

	let div: HTMLDivElement | undefined = $state()
	let style: string = $state("")
	let event: maplibre.MapTouchEvent | maplibre.MapMouseEvent
	let mapsUrl: string = $state("")

	const spacing = 4

	$effect(() => {
		if (!div) return
		if (!getContextMenuEvent()) return

		event = getContextMenuEvent()
		mapsUrl = getMapsUrl(event.lngLat.lat, event.lngLat.lng)

		const { innerWidth, innerHeight } = window;
		const offsetWidth = div.getBoundingClientRect().width
		const offsetHeight = div.getBoundingClientRect().height
		let x = event.point.x
		let y = event.point.y

		if (!isUiLeft()) {
			x -= offsetWidth
		}
		if (x <= spacing) {
			x = spacing
		}
		if (x + offsetWidth > innerWidth + spacing) {
			x = innerWidth - offsetWidth - spacing;
		}
		if (y + offsetHeight > innerHeight + spacing) {
			y = innerHeight - offsetHeight - spacing;
		}
		style = `top: ${y}px; left: ${x}px;`
	})

	function copyCoords() {
		copyToClipboard("" + event.lngLat.lat + "," + event.lngLat.lng)
	}
</script>

<div
	bind:this={div}
	class="absolute py-2 flex flex-col z-50 bg-popover text-popover-foreground min-w-[8rem] rounded-md border p-1 shadow-md focus:outline-hidden"
	style={style}
>
	{#if hasClipboardWrite()}
		<ContextMenuItem onclick={copyCoords}>
			<Clipboard size="14"/>
			<span>{m.context_menu_copy_coordinates()}</span>
		</ContextMenuItem>
	{/if}

	<ContextMenuItem tag="a" href={mapsUrl} target="_blank">
		<Navigation size="14"/>
		<span>{m.context_menu_navigate_here()}</span>
	</ContextMenuItem>

	<ContextMenuItem onclick={() => openToast("This will work eventually")}>
		<Binoculars size="14"/>
		<span>{m.context_menu_scout_location()}</span>
	</ContextMenuItem>
</div>