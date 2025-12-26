<script lang="ts">
	import { slide } from 'svelte/transition';
	import { Binoculars, Clipboard, Navigation, Pin } from "lucide-svelte";
	import ContextMenuItem from '@/components/ui/contextmenu/ContextMenuItem.svelte';
	import * as m from '@/lib/paraglide/messages';

	import { getContextMenuEvent, getIsContextMenuOpen, setIsContextMenuOpen } from '@/lib/ui/contextmenu.svelte.js';
	import { onClickOutside } from 'runed';
	import { openMenu } from '@/lib/ui/menus.svelte.js';
	import { setCurrentScoutCenter, setCurrentScoutCoords } from '@/lib/features/scout.svelte.js';
	import { Coords } from '@/lib/utils/coordinates';
	import {
		backupShareUrl,
		canBackupShare,
		copyToClipboard,
		hasClipboardWrite,
		isMenuSidebar,
		isUiLeft
	} from "@/lib/utils/device";
	import { getMapsUrl } from '@/lib/utils/mapUrl';
	import { hasFeatureAnywhere } from '@/lib/services/user/checkPerm';
	import { getUserDetails } from '@/lib/services/user/userDetails.svelte';
	import { getMap } from "@/lib/map/map.svelte";
	import { Features } from "@/lib/utils/features";

	let div = $state<HTMLDivElement>()
	let style: string = $state("")
	let mapsUrl: string = $state("")

	const spacing = 4

	onClickOutside(() => div, () => setIsContextMenuOpen(false))

	$effect(() => {
		if (!div) return
		if (!getContextMenuEvent()) return
		if (!isMenuSidebar()) return

		const event = getContextMenuEvent()
		if (!event) return

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
		const event = getContextMenuEvent()
		if (!event) return

		copyToClipboard("" + event.lngLat.lat + "," + event.lngLat.lng)
	}

	function openScout() {
		const event = getContextMenuEvent()
		if (!event) return

		const center = Coords.infer(event.lngLat)
		setCurrentScoutCoords([center])
		setCurrentScoutCenter(center)
		openMenu("scout")
	}

	function shareMapPosition() {
		const event = getContextMenuEvent()
		if (!event) return

		const center = Coords.infer(event.lngLat)
		const zoom = getMap()?.getZoom()
		console.log(zoom)

		const url = new URL(window.location.href)
		url.searchParams.set("lat", center.lat.toString())
		url.searchParams.set("lon", center.lon.toString())
		if (zoom) url.searchParams.set("zoom", zoom.toString())

		backupShareUrl(url.toString())
	}
</script>

{#snippet menuItems()}
	{#if hasClipboardWrite()}
		<ContextMenuItem
			Icon={Clipboard}
			label={m.context_menu_copy_coordinates()}
			onclick={copyCoords}
		/>
	{/if}

	{#if canBackupShare({ url: window.location.href })}
		<ContextMenuItem
			Icon={Pin}
			label={m.context_menu_share_position()}
			onclick={shareMapPosition}
		/>
	{/if}

	<ContextMenuItem
		Icon={Navigation}
		label={m.context_menu_navigate_here()}
		tag="a"
		href={mapsUrl}
		target="_blank"
	/>

	{#if hasFeatureAnywhere(getUserDetails().permissions, Features.SCOUT)}
		<ContextMenuItem
			Icon={Binoculars}
			label={m.context_menu_scout_location()}
			onclick={openScout}
		/>
	{/if}
{/snippet}

{#if isMenuSidebar()}
	{#if getIsContextMenuOpen()}
		<div
			bind:this={div}
			class="absolute py-2 flex flex-col z-50 bg-popover text-popover-foreground min-w-32 rounded-md border p-1 shadow-md focus:outline-hidden"
			style={style}
		>
			{@render menuItems()}
		</div>
	{/if}
{:else}
	{#if getIsContextMenuOpen()}
		<div
			class="w-full absolute bottom-2 px-2 z-50"
			transition:slide={{ duration: 70 }}
		>
			<div
				bind:this={div}
				class="w-full flex flex-col bg-popover text-popover-foreground rounded-md border p-1 py-2 shadow-md focus:outline-hidden"
			>
				{@render menuItems()}
			</div>
		</div>
	{/if}
{/if}
