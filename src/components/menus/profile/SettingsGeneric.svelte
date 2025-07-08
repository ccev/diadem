<script lang="ts">
	import SettingsSettingTitle from '@/components/menus/profile/SettingsSettingTitle.svelte';
	import type { Snippet } from 'svelte';

	let {
		title,
		description = "",
		children
	}: {
		title: string,
		description?: string,
		children: Snippet
	} = $props()
</script>

<div class="py-3 px-4 w-full flex flex-col gap-2">
	<SettingsSettingTitle {title} {description} />

	{@render children()}
</div>