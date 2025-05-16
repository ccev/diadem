<script lang="ts">
	import { flyTo } from '@/lib/map/utils.js';
	import LucideIcon from '@/components/utils/LucideIcon.svelte';
	import { Command } from "bits-ui";
	import type { Snippet } from 'svelte';

	let {
		title,
		children
	}: {
		title: string
		children: Snippet
	} = $props()
</script>

<Command.Group>
	<Command.GroupHeading
		class="text-muted-foreground p-1 px-2 py-1.5 text-xs font-medium self-starts"
	>
		{title}
	</Command.GroupHeading>
	<Command.GroupItems>
		{@render children()}
	</Command.GroupItems>
</Command.Group>