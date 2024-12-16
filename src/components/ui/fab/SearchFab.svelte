<script lang="ts">
	import BaseFab from '@/components/ui/fab/BaseFab.svelte';
	import { Search } from 'lucide-svelte';
	import { openModal } from '@/lib/modal.svelte';
</script>

<BaseFab onclick={() => openModal()}>
	<Search size="24" />
</BaseFab>