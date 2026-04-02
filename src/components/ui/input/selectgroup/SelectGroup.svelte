<script lang="ts">
	import { RadioGroup, ToggleGroup } from "bits-ui";
	import type { Snippet } from "svelte";

	let {
		children,
		childCount,
		evenColumns
	}: {
		children: Snippet;
		childCount: number;
		evenColumns: boolean;
	} = $props();

	let colSteps = $derived.by(() => {
		// dumb js to even out the cols. can probably be done with css
		let cols = {
			base: childCount <= 4 ? childCount : 4,
			"0": 4,
			"1": 3,
			"2": 2,
			"3": 1
		};
		if (evenColumns) {
			cols["0"] = childCount === 5 ? 3 : 4;
			cols["0"] = childCount === 6 ? 3 : 4;
			cols["1"] = childCount === 4 ? 2 : 3;
		}

		return cols;
	});
</script>

<div
	style:--cols={colSteps.base}
	style:--step-0-cols={colSteps["0"]}
	style:--step-1-cols={colSteps["1"]}
	style:--step-2-cols={colSteps["2"]}
	style:--step-3-cols={colSteps["3"]}
	class="w-fit contents"
>
	{@render children()}
</div>

<style>
	:global(.select-group) {
		--min-cols: var(--cols);
		grid-template-columns: repeat(min(var(--min-cols), var(--step-0-cols)), minmax(0, 1fr));
	}

	@container menu-container (max-width: 412px) {
		:global(.select-group) {
			--min-cols: var(--step-1-cols);
		}
	}

	@container menu-container (max-width: 318px) {
		:global(.select-group) {
			--min-cols: var(--step-2-cols);
		}
	}

	@container menu-container (max-width: 230px) {
		:global(.select-group) {
			--min-cols: var(--step-3-cols);
		}
	}
</style>
