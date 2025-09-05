<script lang="ts">
	import { getUserSettings } from '@/lib/services/userSettings.svelte.js';
	import Button from '@/components/ui/input/Button.svelte';
	import Switch from '@/components/ui/input/Switch.svelte';
	import MenuTitle from '@/components/menus/MenuTitle.svelte';

	let {
		onclick,
		value,
		title,
		description = "",
	}: {
		onclick: () => void,
		value: boolean,
		title: string,
		description?: string
	} = $props()
</script>

<Button
	variant="ghost"
	size=""
	class="py-3 px-4 w-full flex justify-between! items-center text-left rounded-md"
	onclick={onclick}
>
	<MenuTitle {title} {description} />

	<Switch
		checked={value}
		aria-hidden="true"
		tabindex="-1"
	/>
</Button>