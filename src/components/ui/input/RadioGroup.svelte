<script lang="ts">
	import { RadioGroup } from 'bits-ui';
	import type { Snippet } from 'svelte';

	let {
		childCount = 3,
		class: class_ = "",
		value = "",
		children = undefined,
		evenColumns = true,
		...rest
	}: {
		childCount?: number
		class?: string
		value?: string
		children?: Snippet
		evenColumns?: boolean
	} & RadioGroup.RootProps = $props()

	let step0Cols
	let step1Cols
	let step2Cols = 2
	let step3Cols = 1

	if (evenColumns) {
		step0Cols = childCount === 5 ? 3 : 4
		step1Cols = childCount === 4 ? 2 : 3
	} else {
		step0Cols = 4
		step1Cols = 3
	}
</script>

<RadioGroup.Root
	--cols={childCount <= 4 ? childCount : 4}
	--step-0-cols={step0Cols}
	--step-1-cols={step1Cols}
	--step-2-cols={step2Cols}
	--step-3-cols={step3Cols}
	bind:value
	orientation="horizontal"
	class="radio-group w-fit grid gap-4 {class_}"
	{...rest}
>
	{@render children?.()}
</RadioGroup.Root>

<style>
    :global(.radio-group) {
        --min-cols: var(--cols);
        grid-template-columns: repeat(min(var(--min-cols), var(--step-0-cols)), minmax(0, 1fr))
    }

    @container menu-container (max-width: 412px) {
        :global(.radio-group) {
            --min-cols: var(--step-1-cols);
        }
    }

    @container menu-container (max-width: 318px) {
        :global(.radio-group) {
            --min-cols: var(--step-2-cols);
        }
    }

    @container menu-container (max-width: 230px) {
        :global(.radio-group) {
            --min-cols: var(--step-3-cols);
        }
    }
</style>