<script lang="ts">
	import { RadioGroup as RadioGroupPrimitive } from "bits-ui";
	import Circle from "lucide-svelte/icons/circle";


	let {
		class: class_ = "",
		value = "",
		children = null,
		...rest
	} = $props()
</script>

<RadioGroupPrimitive.Item
	{value}
	class="w-12 h-12 bg-red-300 {class_}"
	{...rest}
>
	<div class="flex items-center justify-center">
		<RadioGroupPrimitive.ItemIndicator>
			<Circle class="h-2.5 w-2.5 fill-current text-current" />
		</RadioGroupPrimitive.ItemIndicator>
	</div>
</RadioGroupPrimitive.Item>