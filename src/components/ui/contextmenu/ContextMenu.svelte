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

	let div: HTMLDivElement | undefined = $state()
	let style: string = $state("")
	let event: maplibre.MapTouchEvent | maplibre.MapMouseEvent
	let mapsUrl: string = $state("")

	$effect(() => {
		if (!div) return
		if (!getContextMenuEvent()) return

		event = getContextMenuEvent()
		mapsUrl = getMapsUrl(event.lngLat.lat, event.lngLat.lng)

		const { innerWidth, innerHeight } = window;
		const offsetWidth = div.getBoundingClientRect().width + 4
		const offsetHeight = div.getBoundingClientRect().height + 4
		let x = event.point.x
		let y = event.point.y

		if (x + offsetWidth > innerWidth) {
			x = innerWidth - offsetWidth;
		}
		if (y + offsetHeight > innerHeight) {
			y = innerHeight - offsetHeight;
		}
		style = `top: ${y}px; left: ${x}px;`
	})

	function copyCoords() {
		copyToClipboard("" + event.lngLat.lat + "," + event.lngLat.lng)
	}
</script>

<div
	bind:this={div}
	class="absolute py-2 flex flex-col z-50 bg-popover text-popover-foreground min-w-[8rem] rounded-md border p-1 shadow-md focus:outline-none"
	style={style}
>
	{#if hasClipboardWrite()}
		<ContextMenuItem onclick={copyCoords}>
			<Clipboard size="14"/>
			<span>Copy coordinates</span>
		</ContextMenuItem>
	{/if}

	<ContextMenuItem tag="a" href={mapsUrl} target="_blank">
		<Navigation size="14"/>
		<span>Navigate here</span>
	</ContextMenuItem>

	<ContextMenuItem onclick={() => openToast("This will work eventually")}>
		<Binoculars size="14"/>
		<span>Scout location</span>
	</ContextMenuItem>
</div>