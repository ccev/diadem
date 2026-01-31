<script lang="ts">
	import { ToggleGroup } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import SelectGroup from '@/components/ui/input/selectgroup/SelectGroup.svelte';

	let {
		childCount = 3,
		class: class_ = '',
		children = undefined,
		evenColumns = true,
		onchange = () => {},
		values = $bindable(),
		orientation = "horizontal"
	}: {
		childCount?: number
		class?: string
		children?: Snippet
		onchange?: (values: string[]) => void
		evenColumns?: boolean,
		values: string[],
		orientation?: "horizontal" | "vertical"
	} = $props();
</script>

<SelectGroup
	{childCount}
	{evenColumns}
>
	<ToggleGroup.Root
		bind:value={values}
		onValueChange={onchange}
		type="multiple"
		class="select-group w-fit grid gap-4 {class_}"
		{orientation}
	>
		{@render children?.()}
	</ToggleGroup.Root>
</SelectGroup>
