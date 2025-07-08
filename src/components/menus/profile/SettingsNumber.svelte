<script lang="ts">
	import { getUserSettings } from '@/lib/userSettings.svelte.js';
	import Input from '@/components/menus/profile/Input.svelte';
	import SettingsSettingTitle from '@/components/menus/profile/SettingsSettingTitle.svelte';

	let {
		onchange,
		value,
		title,
		description = "",
		...rest
	}: {
		onchange: (e: Event & {target: HTMLInputElement}) => void,
		value: number,
		title: string,
		description?: string,
	} = $props()
</script>

<div
	class="py-3 px-4 w-full flex justify-between items-center text-left rounded-md gap-2"
>
	<SettingsSettingTitle {title} {description} />

	<Input
		class="w-20 text-center"
		type="number"
		value={value}
		onchange={onchange}
		{...rest}
	/>
</div>