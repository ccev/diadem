<script lang="ts">
	import { Switch as SwitchPrimitive } from "bits-ui";

	let {
		class: class_ = "",
		checked = $bindable(),
		...rest
	}: {
		class?: string
		checked?: boolean
	} & SwitchPrimitive.RootProps = $props()

</script>

<SwitchPrimitive.Root
	bind:checked
	class="ring-transparent dark:ring-card ring-2 focus-visible:ring-ring focus-visible:ring-offset-background data-[state=checked]:bg-primary data-[state=unchecked]:bg-input peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {class_}"
	{...rest}
>
	<SwitchPrimitive.Thumb
		class="bg-background pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
	/>
</SwitchPrimitive.Root>