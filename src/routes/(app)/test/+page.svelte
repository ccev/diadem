<script lang="ts">
	import QuestFilterset from '@/components/menus/filters/modals/QuestFilterset.svelte';
	import { openModal } from '@/lib/ui/modal.svelte.js';
	openModal("filtersetQuest")
</script>

<QuestFilterset isInEdit={false} />