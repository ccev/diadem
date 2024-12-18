<script lang="ts">
	import { ToggleGroup as ToggleGroupPrimitive } from 'bits-ui';

	let {
		class: class_ = "",
		value = "",
		children = null,
		...rest
	} = $props()
</script>

<ToggleGroupPrimitive.Item
	{value}
	class=
		"bg-card ring-accent ring-2 w-20 h-fit text-sm font-medium rounded-lg flex
		flex-col items-center gap-1 ring-offset-background focus-visible:ring-ring
		hover:bg-muted data-[state=on]:ring-ring data-[state=on]:ring-2
		transition-colors focus-visible:outline-none focus-visible:ring-2
		focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {class_}"
	{...rest}
>
	{@render children?.()}
</ToggleGroupPrimitive.Item>



