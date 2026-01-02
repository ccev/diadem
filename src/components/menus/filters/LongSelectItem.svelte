<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		isSelected = $bindable(),
		onselect,
		children,
	}: {
		isSelected: boolean,
		onselect: (isSelected: boolean) => void,
		children: Snippet
	} = $props();

	const isCompact = false;
</script>


<button
	class="p-1 flex flex-col items-center text-sm cursor-pointer hover:bg-accent"
	class:w-20={!isCompact}
	class:h-22={!isCompact}
	class:py-1={!isCompact}
	class:rounded-sm={!isCompact}
	class:size-10={isCompact}
	class:bg-sky-100={isSelected}
	class:dark:bg-indigo-950={isSelected}
	onclick={() => {
		isSelected = !isSelected
		onselect(isSelected)
	}}
>
	{@render children()}
</button>