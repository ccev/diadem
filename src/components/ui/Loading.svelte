<script lang="ts">
	import { Meter } from "bits-ui";
	import { getLoadingProgress } from '@/lib/initialLoad.svelte';
</script>

<div class="w-screen h-screen flex flex-col gap-2 justify-center items-center bg-background fixed z-50 top-0 left-0">
	<span class="">
		Loading
	</span>

	<Meter.Root
		min={0}
		max={100}
		value={getLoadingProgress()}
		class="bg-accent relative h-1 w-32 overflow-hidden rounded-full"
	>
		<div
			class="h-full w-full flex-1 rounded-full transition-all duration-200 ease-in-out bg-foreground"
			style="transform: translateX(-{100 - getLoadingProgress()}%)"
		></div>
	</Meter.Root>
</div>