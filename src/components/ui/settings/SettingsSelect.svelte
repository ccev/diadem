<script lang="ts">
	import Button from '@/components/ui/Button.svelte';
	import SettingsSettingTitle from '@/components/ui/settings/SettingsSettingTitle.svelte';
	import { closeModal, openModal } from '@/lib/modal.svelte';
	import Card from '@/components/ui/Card.svelte';
	import ContextMenuItem from '@/components/ui/contextmenu/ContextMenuItem.svelte';

	let {
		onselect,
		value,
		title,
		description = "",
		options,
	}: {
		onselect: (value: string) => void,
		value: string,
		title: string,
		description?: string,
		options: {value: string, label: string}[]
	} = $props()
</script>

{#snippet selectOption(label, optionValue)}
	<Button
		variant="ghost"
		size=""
		class="px-4 gap-2 py-4 w-full rounded-sm text-base justify-center ring-ring {optionValue === value ? 'ring-2' : ''}"
		onclick={(e) => {e.stopPropagation(); closeModal(); onselect(optionValue)}}
	>
		{label}
	</Button>
{/snippet}

{#snippet selectModal()}
	<div
		style="width: min(calc(100vw - 1rem), 32rem);"
		class="py-4 px-3 flex flex-col gap-0.5 bg-popover text-popover-foreground border rounded-md"
	>
		{#each options as option}
			{@render selectOption(option.label, option.value)}
		{/each}
	</div>
{/snippet}

<Button
	variant="ghost"
	size=""
	class="relative group py-3 px-4 w-full flex justify-between items-center text-left rounded-md"
	onclick={() => openModal(selectModal)}
>
	<SettingsSettingTitle {title} {description} />

	<span
		class="border-border dark:group-hover:border-card ring-offset-background rounded-md border px-6 py-2 text-sm"
	>
		{options.find(o => o.value === value)?.label}
	</span>

</Button>