<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import Switch from "@/components/ui/input/Switch.svelte";

	let {
		label,
		value = $bindable(),
		onchange = undefined
	}: {
		label: string;
		value: boolean;
		onchange?: (value: boolean) => void;
	} = $props();
</script>

<Button
	variant="ghost"
	class="rounded-none! justify-between w-full px-4! py-1! h-fit! items-center"
	style="grid-column: 1 / -1"
	onclick={() => {
		value = !value;
		if (onchange) onchange(value);
	}}
>
	<div class="font-semibold text-left py-2">
		{label}
	</div>

	<Switch class="ml-auto" checked={value} aria-hidden="true" tabindex={-1} />
</Button>
