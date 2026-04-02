<script lang="ts">
	import { RadioGroup } from "bits-ui";
	import type { Snippet } from "svelte";
	import SelectGroup from "@/components/ui/input/selectgroup/SelectGroup.svelte";

	let {
		childCount = 3,
		class: class_ = "",
		value = "",
		children = undefined,
		evenColumns = true,
		...rest
	}: {
		childCount?: number;
		class?: string;
		value?: string;
		children?: Snippet;
		evenColumns?: boolean;
	} & RadioGroup.RootProps = $props();
</script>

<SelectGroup {childCount} {evenColumns}>
	<RadioGroup.Root
		bind:value
		orientation="horizontal"
		class="select-group w-fit grid gap-4 {class_}"
		{...rest}
	>
		{@render children?.()}
	</RadioGroup.Root>
</SelectGroup>
