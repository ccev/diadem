<script lang="ts">
	import Input from '@/components/ui/input/Input.svelte';
	import MenuTitle from '@/components/menus/MenuTitle.svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		class: class_ = "",
		onchange,
		value,
		title,
		description = '',
		...rest
	}: {
		class: string,
		onchange: (e: Event & { target: HTMLInputElement }) => void,
		value: string,
		title: string,
		description?: string,
	} & HTMLInputAttributes = $props();
</script>

<div
	class="py-3 w-full text-left rounded-md gap-2 {class_}"
>
	<MenuTitle {title} {description} />

	<Input
		class="w-full mt-2 py-6"
		value={value}
		onchange={onchange}
		{...rest}
	/>
</div>