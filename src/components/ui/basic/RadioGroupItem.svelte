<script lang="ts">
	import { RadioGroup } from 'bits-ui';
	import type { Snippet } from 'svelte';

	let {
		class: class_ = "",
		value,
		children = undefined,
		...rest
	}: {
		class?: string
		value: string
		children?: Snippet
	} & RadioGroup.ItemProps = $props()
</script>

<RadioGroup.Item
	{value}
	class=
		"cursor-pointer bg-card ring-accent ring-2 h-fit w-full text-sm font-medium rounded-md flex
		justify-center items-center gap-2 ring-offset-background focus-visible:ring-ring
		active:bg-muted hover:bg-muted data-[state=checked]:ring-ring data-[state=checked]:ring-2
		transition-colors focus-visible:outline-hidden focus-visible:ring-2
		focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {class_}"
	{...rest}
>
	{@render children?.()}
</RadioGroup.Item>
