<script lang="ts">
	import { getMap, resetMap } from '@/lib/map/map.svelte';
	import { openModal } from '@/lib/modal.svelte';
	import Search from '@/components/ui/search/Search.svelte';
	import BaseFab from '@/components/ui/fab/BaseFab.svelte';
	import LocateFab from '@/components/ui/fab/LocateFab.svelte';
	import {
		ArrowBigDown,
		ArrowBigUp,
		ArrowBigUpDash,
		ArrowUp,
		ArrowUpFromDot, ChevronUp, MousePointer2,
		Search as SearchIcon
	} from 'lucide-svelte';
	import { hasLoadedFeature, LoadedFeature } from '@/lib/initialLoad.svelte';
	import { isSupportedFeature } from '@/lib/enabledFeatures';
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
		if (e.key === 'k' && (e.metaKey || e.ctrlKey) && isSearchAllowed) {
			e.preventDefault();
			openModal(searchModalSnippet, 'top');
		}
	}
</script>

<svelte:document onkeydown={handleKeydown} />

{#snippet searchModalSnippet()}
	<Search />
{/snippet}

<div
	class="mx-2 gap-2 flex-col flex items-center"
	hidden={!getMap()}
>
	{#if isMapSkewed()}
		<div transition:slide={{ duration: 120 }}>
			<BaseFab
				onclick={() => resetMap()}
				class="rounded-full! size-13!"
			>
				<MousePointer2
					size="24"
					style="transform: rotateX({getSkew().pitch}deg) rotateZ({-getSkew().bearing + 45}deg);"
				/>
			</BaseFab>
		</div>
	{/if}

	{#if isSearchAllowed}
		<BaseFab
			onclick={() => openModal(searchModalSnippet, "top")}
		>
			<SearchIcon size="24" />
		</BaseFab>
	{/if}

	<LocateFab />

</div>