<script lang="ts">
	import Switch from "@/components/ui/input/Switch.svelte";

	let {
		label: title,
		value = $bindable(),
		onchange = undefined
	}: {
		label: string;
		value: boolean;
		onchange?: (value: boolean) => void;
	} = $props();
</script>

<Switch
	class="rounded-none! first:rounded-t-lg! last:rounded-b-lg! px-4 py-1"
	style="grid-column: 1 / -1"
	bind:checked={value}
	onCheckedChange={onchange}
	aria-label={title}
>
	{#snippet label()}
		<span class="min-w-0 whitespace-normal wrap-anywhere font-semibold text-left py-2">{title}</span
		>
	{/snippet}
</Switch>
