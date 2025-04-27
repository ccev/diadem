<script lang="ts">
	import { getUserSettings } from '@/lib/userSettings.svelte.js';
	import Button from '@/components/ui/Button.svelte';
	import Switch from '@/components/ui/settings/Switch.svelte';
	import SettingsSettingTitle from '@/components/ui/settings/SettingsSettingTitle.svelte';

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
	<SettingsSettingTitle {title} {description} />

	<Switch
		checked={value}
		aria-hidden="true"
		tabindex="-1"
	/>
</Button>