<script lang="ts">
	import { Switch as SwitchPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";

	let {
		class: class_ = "",
		checked = $bindable(),
		label,
		...rest
	}: {
		class?: string;
		checked?: boolean;
		label?: Snippet;
	} & SwitchPrimitive.RootProps = $props();

	const trackClass =
		"ring-transparent dark:ring-card ring-2 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors";
	const focusClass =
		"cursor-pointer focus-visible:outline-hidden focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";
</script>

{#snippet thumb()}
	<SwitchPrimitive.Thumb
		class="bg-background pointer-events-none block size-5 rounded-full shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
	/>
{/snippet}

<SwitchPrimitive.Root
	bind:checked
	class="{focusClass} {label
		? 'flex w-full items-center justify-between gap-2 rounded-md text-sm font-medium text-left transition-colors hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground'
		: trackClass} {class_}"
	{...rest}
>
	{#if label}
		{@render label()}
		<span class={trackClass} data-state={checked ? "checked" : "unchecked"} aria-hidden="true">
			{@render thumb()}
		</span>
	{:else}
		{@render thumb()}
	{/if}
</SwitchPrimitive.Root>
