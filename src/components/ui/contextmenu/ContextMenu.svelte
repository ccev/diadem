<script lang="ts">
	import { slide } from 'svelte/transition';
	import { Binoculars, Clipboard, Navigation } from 'lucide-svelte';
	import ContextMenuItem from '@/components/ui/contextmenu/ContextMenuItem.svelte';
	import { copyToClipboard, getMapsUrl, hasClipboardWrite } from '@/lib/utils.svelte';
	import * as m from '@/lib/paraglide/messages';

	import { getContextMenuEvent, getIsContextMenuOpen, setIsContextMenuOpen } from '@/lib/map/contextmenu.svelte';
	import { onClickOutside } from 'runed';
	import { isMenuSidebar, isUiLeft, openMenu } from '@/lib/menus.svelte';
	import { setCurrentScoutCenter, setCurrentScoutCoords } from '@/lib/scout.svelte';
	import { Coords } from '@/lib/utils/coordinates';

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
</script>

{#snippet menuItems()}
	{#if hasClipboardWrite()}
		<ContextMenuItem
			Icon={Clipboard}
			label={m.context_menu_copy_coordinates()}
			onclick={copyCoords}
		/>
	{/if}

	<ContextMenuItem
		Icon={Navigation}
		label={m.context_menu_navigate_here()}
		tag="a"
		href={mapsUrl}
		target="_blank"
	/>

	<ContextMenuItem
		Icon={Binoculars}
		label={m.context_menu_scout_location()}
		onclick={openScout}
	/>
{/snippet}

{#if isMenuSidebar()}
	{#if getIsContextMenuOpen()}
		<div
			bind:this={div}
			class="absolute py-2 flex flex-col z-50 bg-popover text-popover-foreground min-w-[8rem] rounded-md border p-1 shadow-md focus:outline-hidden"
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
