<script lang="ts">
	import { fly } from "svelte/transition";
	import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
	import { type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import PopupBaseDrawer from "@/components/ui/popups/common/PopupBaseDrawer.svelte";
	import { Coords } from "$lib/utils/coordinates";
	import { watch } from "runed";
	import PopupBaseStatic from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import { getPopupProps } from "@/lib/ui/popupProps";
	import { isAllowedTwoSidebars } from "$lib/utils/device";
	import { closeMenu } from "$lib/ui/menus.svelte";
	import { isSearchViewActive } from "$lib/features/activeSearch.svelte";
	import {
		centerRequestedMapObjectIfPopupCovers,
		getPopupVisibilityRequest,
		setPopupOcclusion,
		type PopupVisibilityRequest
	} from "$lib/mapObjects/popupVisibility.svelte";

	let {
		alwaysExpanded = false
	}: {
		alwaysExpanded?: boolean;
	} = $props();

	let data = $derived(getCurrentSelectedData());
	let doesDataExist = $derived(Boolean(data && data.type !== MapObjectType.S2_CELL));
	let snapshotData: MapData | undefined = $state(undefined);
	let popupWidth = 0;
	let pendingVisibilityRequest: PopupVisibilityRequest | undefined;

	function checkPopupVisibility() {
		if (!pendingVisibilityRequest || !popupWidth) return;

		const request = pendingVisibilityRequest;
		pendingVisibilityRequest = undefined;
		centerRequestedMapObjectIfPopupCovers(request, { width: popupWidth });
	}

	function updatePopupWidth(width: number | undefined) {
		popupWidth = width ?? 0;
		setPopupOcclusion(popupWidth ? { width: popupWidth } : undefined);
		checkPopupVisibility();
	}

	watch(
		() => getPopupVisibilityRequest(),
		(request) => {
			pendingVisibilityRequest = alwaysExpanded ? request : undefined;
			checkPopupVisibility();
		}
	);

	watch(
		() => data,
		() => {
			if (doesDataExist && data) {
				if (!isAllowedTwoSidebars()) {
					closeMenu();
				}
				snapshotData = $state.snapshot(data);
			} else {
				setPopupOcclusion(undefined);
			}
		}
	);

	let popupData = $derived(data ?? snapshotData);
	let popupProps = $derived(popupData ? getPopupProps(popupData) : undefined);
	let popupCoords = $derived(new Coords(popupData?.lat ?? 0, popupData?.lon ?? 0));
</script>

{#if alwaysExpanded}
	{#if doesDataExist}
		<div
			bind:offsetWidth={null, updatePopupWidth}
			class="h-full min-w-80 max-w-110 basis-110 shrink grow-0"
			transition:fly={{ duration: 130, x: 120 }}
			class:pt-18={isSearchViewActive()}
		>
			<div
				class="z-10 h-full relative overflow-y-auto rounded-l-xl border border-border bg-card pt-6 pointer-events-auto"
			>
				<PopupBaseStatic
					coords={popupCoords}
					data={popupData}
					props={popupProps}
					onlyShowNavigationButton={false}
				/>
			</div>
		</div>
	{/if}
{:else}
	<PopupBaseDrawer open={doesDataExist} coords={popupCoords} data={popupData} props={popupProps} />
{/if}
