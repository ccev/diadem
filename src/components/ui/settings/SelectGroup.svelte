<script lang="ts">
	import { RadioGroup as RadioGroupPrimitive } from "bits-ui";

	let {
		class: class_ = "",
		value = "",
		children = null,
		...rest
	} = $props()
</script>

<RadioGroupPrimitive.Root bind:value class="flex justify-evenly {class_}" {...rest}>
	{@render children?.()}
</RadioGroupPrimitive.Root>