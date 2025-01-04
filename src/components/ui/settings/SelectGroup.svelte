<script lang="ts">
	import { ToggleGroup as ToggleGroupPrimitive } from 'bits-ui';

	let {
		childCount = 3,
		class: class_ = "",
		value = "",
		children = null,
		evenColumns = true,
		...rest
	} = $props()

	let step0Cols = 4
	let step1Cols = 3
	let step2Cols = 2
	let step3Cols = 1

	if (evenColumns) {
		step0Cols = childCount === 5 ? 3 : 4
		step1Cols = childCount === 4 ? 2 : 3
	}
</script>

<ToggleGroupPrimitive.Root
	--cols={childCount <= 4 ? childCount : 4}
	--step-0-cols={step0Cols}
	--step-1-cols={step1Cols}
	--step-2-cols={step2Cols}
	--step-3-cols={step3Cols}
	bind:value
	class="toggle-group grid w-fit gap-4 {class_}"
	{...rest}
>
	{@render children?.()}
</ToggleGroupPrimitive.Root>

<style>
	:global(.toggle-group) {
		--min-cols: var(--cols);
        grid-template-columns: repeat(min(var(--min-cols), var(--step-0-cols)), minmax(0, 1fr))
	}

    @media only screen and (max-width: 412px) {
        :global(.toggle-group) {
            --min-cols: var(--step-1-cols);
		}
    }

    @media only screen and (max-width: 318px) {
        :global(.toggle-group) {
            --min-cols: var(--step-2-cols);
		}
    }

    @media only screen and (max-width: 230px) {
        :global(.toggle-group) {
            --min-cols: var(--step-3-cols);
		}
    }
</style>