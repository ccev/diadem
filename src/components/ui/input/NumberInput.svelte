<script lang="ts">
	import Input from "@/components/ui/input/Input.svelte";
	import MenuTitle from "@/components/menus/MenuTitle.svelte";
	import type { HTMLInputAttributes } from "svelte/elements";

	let {
		onchange,
		value,
		title,
		description = "",
		...rest
	}: {
		onchange: (e: Event & { target: HTMLInputElement }) => void;
		value: number;
		title: string;
		description?: string;
	} & HTMLInputAttributes = $props();
</script>

<div class="py-3 px-4 w-full flex justify-between items-center text-left rounded-md gap-2">
	<MenuTitle {title} {description} />

	<Input class="w-20 text-center" type="number" {value} {onchange} {...rest} />
</div>
