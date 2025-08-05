<script lang="ts">
	import { getMap } from '@/lib/map/map.svelte';
	import { openModal } from '@/lib/modal.svelte';
	import Search from '@/components/ui/search/Search.svelte';
	import BaseFab from '@/components/ui/fab/BaseFab.svelte';
	import LocateFab from '@/components/ui/fab/LocateFab.svelte';
	import { Search as SearchIcon } from 'lucide-svelte';
	import { hasLoadedFeature, LoadedFeature } from '@/lib/initialLoad.svelte';
	import { isSupportedFeature } from '@/lib/enabledFeatures';

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			openModal(searchModalSnippet, "top")
		}
	}
</script>

<svelte:document onkeydown={handleKeydown} />

{#snippet searchModalSnippet()}
	<Search/>
{/snippet}

{#if getMap()}
	<div
		class="mx-2 gap-2 flex-col flex"
	>
		{#if
			hasLoadedFeature(LoadedFeature.SUPPORTED_FEATURES)
			&& isSupportedFeature("koji")
			&& hasLoadedFeature(LoadedFeature.KOJI)
		}
		<BaseFab onclick={() => openModal(searchModalSnippet, "top")}>
			<SearchIcon size="24" />
		</BaseFab>
		{/if}

		<LocateFab />

	</div>
{/if}