<script lang="ts">
	import Switch from "@/components/ui/input/Switch.svelte";
	import MenuTitle from "@/components/menus/MenuTitle.svelte";

	let {
		onclick,
		value,
		title,
		description = ""
	}: {
		onclick: () => void;
		value: boolean;
		title: string;
		description?: string;
	} = $props();
</script>

<Switch class="py-3 px-4" checked={value} onCheckedChange={() => onclick()} aria-label={title}>
	{#snippet label()}
		<MenuTitle {title} {description} />
	{/snippet}
</Switch>
