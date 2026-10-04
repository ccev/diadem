<script lang="ts">
	import PopupButton from "@/components/ui/popups/common/PopupButton.svelte";
	import type { MapData } from "@/lib/mapObjects/mapObjectTypes";
	import { ClientMapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { getPrimaryPopupActions } from "@/lib/ui/primaryPopupActions";
	import { getPopupActions } from "@/lib/ui/popupActions";
	import { isMenuSidebar } from "@/lib/utils/device";

	let { lat, lon, data }: { lat: number; lon: number; data: MapData } = $props();
	const actions = $derived(getPrimaryPopupActions(data, lat, lon));
	const type = $derived(data.type === ClientMapObjectType.LOCATION ? undefined : data.type);
</script>

<div
	class="px-4 flex gap-2 w-full overflow-x-auto pb-2"
	class:flex-wrap={isMenuSidebar()}
	class:*:flex-1={isMenuSidebar()}
>
	{#each actions as action}
		<PopupButton
			variant={action.href ? "default" : "secondary"}
			Icon={action.Icon}
			label={action.label}
			tag={action.href ? "a" : "button"}
			href={action.href}
			target={action.href ? "_blank" : undefined}
			onclick={action.onclick}
			actions={action.popupAction ? getPopupActions(type, action.popupAction) : undefined}
		/>
	{/each}
</div>
