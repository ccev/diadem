<script lang="ts">
	import BaseFab from '@/components/ui/fab/BaseFab.svelte';
	import Search from '@/components/ui/search/Search.svelte';
	import { Search as SearchIcon } from 'lucide-svelte';
	import { openModal } from '@/lib/modal.svelte';
</script>

{#snippet searchModalSnippet()}
	<Search />
{/snippet}

<BaseFab onclick={() => openModal(searchModalSnippet, "top")}>
	<SearchIcon size="24" />
</BaseFab>