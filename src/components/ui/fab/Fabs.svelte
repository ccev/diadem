<script lang="ts">
	import { getMap, resetMap } from '@/lib/map/map.svelte';
	import { isAnyModalOpen, isOpenModal, openModal } from "@/lib/ui/modal.svelte.js";
	import Search from '@/components/ui/search/Search.svelte';
	import BaseFab from '@/components/ui/fab/BaseFab.svelte';
	import LocateFab from '@/components/ui/fab/LocateFab.svelte';
	import {
		ArrowBigDown,
		ArrowBigUp,
		ArrowBigUpDash,
		ArrowUp,
		ArrowUpFromDot, ChevronUp, MousePointer2, Navigation2,
		Search as SearchIcon
	} from 'lucide-svelte';
	import { hasLoadedFeature, LoadedFeature } from '@/lib/services/initialLoad.svelte.js';
	import { isSupportedFeature } from '@/lib/services/supportedFeatures';
	import { getSkew, isMapSkewed } from '@/lib/map/mapSkew.svelte';
	import { fade, scale, slide } from 'svelte/transition';

	let isSearchAllowed = $derived(
		hasLoadedFeature(LoadedFeature.SUPPORTED_FEATURES)
		&& (
			hasLoadedFeature(LoadedFeature.KOJI) &&
			isSupportedFeature('koji')
		) || (
			isSupportedFeature('geocoding')
		)
	);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'k' && (e.metaKey || e.ctrlKey) && isSearchAllowed && !isAnyModalOpen()) {
			e.preventDefault();
			openModal("search");
		}
	}
</script>

<svelte:document onkeydown={handleKeydown} />

{#if isOpenModal("search")}
<Search />
{/if}

<div
	class="mx-2 gap-2 flex-col flex items-center"
	hidden={!getMap()}
>
	{#if isMapSkewed()}
		<div transition:slide={{ duration: 120 }}>
			<BaseFab
				onclick={() => resetMap()}
				class="rounded-full!"
			>
				<Navigation2
					size="24"
					style="transform: rotateX({getSkew().pitch}deg) rotateZ({-getSkew().bearing}deg);"
				/>
			</BaseFab>
		</div>
	{/if}

	{#if isSearchAllowed}
		<BaseFab
			onclick={() => openModal("search")}
		>
			<SearchIcon size="24" />
		</BaseFab>
	{/if}

	<LocateFab />

</div>