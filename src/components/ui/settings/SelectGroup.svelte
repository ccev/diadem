<script lang="ts">
	import { ToggleGroup as ToggleGroupPrimitive } from 'bits-ui';

	let {
		childCount = 3,
		class: class_ = "",
		value = "",
		children = null,
		...rest
	} = $props()

	if (childCount > 4) {
		childCount = 4
	}

	let step1Cols = 3
	let step2Cols = 2
	let step3Cols = 1

	if (childCount === 4) {
		step1Cols = 2
	}
</script>

<ToggleGroupPrimitive.Root
	--cols={childCount}
	--step-1-cols={step1Cols}
	--step-2-cols={step2Cols}
	--step-3-cols={step3Cols}
	bind:value
	class="toggle-group grid w-fit self-center gap-4 {class_}"
	{...rest}
>
	{@render children?.()}
</ToggleGroupPrimitive.Root>

<style>
	:global(.toggle-group) {
		--min-cols: var(--cols);
        grid-template-columns: repeat(min(var(--min-cols), var(--cols)), minmax(0, 1fr))
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