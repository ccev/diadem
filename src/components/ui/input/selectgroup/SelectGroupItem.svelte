<script lang="ts">
	import { RadioGroup, ToggleGroup } from 'bits-ui';
	import type { Snippet } from 'svelte';

	let {
		type = "radio",
		class: class_ = "",
		value,
		children = undefined,
	}: {
		type?: "radio" | "toggle"
		class?: string
		value: string
		children?: Snippet
	} = $props()

	const Item = $derived(type === "toggle" ? ToggleGroup.Item : RadioGroup.Item)
</script>

<Item
	{value}
	class=
		"flex-col rounded-lg w-20 gap-1 cursor-pointer bg-card ring-accent ring-2 h-fit text-sm font-medium flex
		justify-center items-center ring-offset-background focus-visible:ring-ring
		active:bg-muted hover:bg-muted
		data-[state=checked]:ring-ring data-[state=checked]:ring-2
		data-[state=on]:ring-ring data-[state=on]:ring-2
		transition-colors focus-visible:outline-hidden focus-visible:ring-2
		focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {class_}"
>
	{@render children?.()}
</Item>
