<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import MenuTitle from "@/components/menus/MenuTitle.svelte";
	import { closeModal, openModal, openSelectModal } from "@/lib/ui/modal.svelte.js";
	import Card from "@/components/ui/Card.svelte";
	import ContextMenuItem from "@/components/ui/contextmenu/ContextMenuItem.svelte";
	import Modal from "@/components/ui/modal/Modal.svelte";
	import type { Snippet } from "svelte";

	let {
		onselect,
		value,
		title,
		description = "",
		options,
		class: class_ = "",
		trigger = undefined
	}: {
		onselect: (value: string) => void;
		value: string;
		title: string;
		description?: string;
		options: { value: string; label: string }[];
		class?: string;
		trigger?: Snippet<[() => void]>;
	} = $props();
</script>

{#snippet selectOption(label, optionValue)}
	<Button
		variant="ghost"
		size=""
		class="px-4 gap-2 py-4 w-full rounded-sm text-base justify-center ring-ring {optionValue ===
		value
			? 'ring-2'
			: ''}"
		onclick={(e) => {
			e.stopPropagation();
			closeModal("select");
			onselect(optionValue);
		}}
	>
		{label}
	</Button>
{/snippet}

{#snippet selectOptions()}
	{#each options as option}
		{@render selectOption(option.label, option.value)}
	{/each}
{/snippet}

{#if trigger}
	{@render trigger(() => openSelectModal(selectOptions))}
{:else}
	<Button
		variant="ghost"
		size=""
		class="{class_} relative group w-full flex justify-between! items-center text-left rounded-md"
		onclick={() => openSelectModal(selectOptions)}
	>
		<MenuTitle {title} {description} />

		<span
			class="border-border dark:group-hover:border-card dark:group-active:border-card ring-offset-background rounded-md border px-6 py-2 text-sm"
		>
			{options.find((o) => o.value === value)?.label}
		</span>
	</Button>
{/if}
