<script lang="ts">
	import { Meter } from "bits-ui";
	import { getLoadingProgress } from '@/lib/initialLoad.svelte';
</script>

<Meter.Root
	min={0}
	max={1}
	value={getLoadingProgress(1)}
	class="fixed top-0 h-1 z-50 w-full overflow-hidden pointer-events-none"
>
	<div
		class="h-full w-full flex-1 transition-all duration-200 ease-in-out bg-foreground"
		style="transform: translateX(-{100 - getLoadingProgress(1) * 100}%)"
	></div>
</Meter.Root>
