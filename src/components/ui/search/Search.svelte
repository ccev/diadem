<script lang="ts">
	import { Command } from "bits-ui";
	import { onMount } from 'svelte';
	import { Search, X } from 'lucide-svelte';
	import GroupArea from '@/components/ui/search/GroupArea.svelte';
	import GroupAddress from '@/components/ui/search/GroupAddress.svelte';
	import { isSupportedFeature } from '@/lib/enabledFeatures';
	import { getKojiGeofences } from '@/lib/koji';
	import * as m from '@/lib/paraglide/messages';
	import CloseButton from '@/components/ui/CloseButton.svelte';
	import { closeModal } from '@/lib/modal.svelte';
	import Button from '@/components/ui/basic/Button.svelte';

	let input: HTMLInputElement | undefined = $state()
	let searchQuery: string = $state("")

	onMount(() => {
		input?.focus()
	})
</script>

<Command.Root
	class="rounded-lg border bg-card text-card-foreground"
	shouldFilter={false}
>
	<div class="flex items-center border-b pb-px pr-px pl-2">
		<Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />

		<Command.Input
			bind:value={searchQuery}
			placeholder={m.search_placeholder()}
			autocomplete="off"
			spellcheck="false"
			type="search"
			class="placeholder:text-muted-foreground flex h-11 w-full rounded-md bg-transparent py-3 pr-2 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
			style="width: min(calc(100vw - 1rem), 32rem)"
		/>

		<Button
			variant="ghost"
			size=""
			class="rounded-md p-2 mr-1"
			onclick={() => closeModal()}
		>
			<X size="20" class="opacity-50" />
		</Button>
	</div>

	<Command.List class="overflow-y-auto overflow-x-hidden mx-1 pb-1 max-h-[32rem]">
		<Command.Viewport>
			{#if isSupportedFeature("geocoding")}
				<GroupAddress {searchQuery} />
			{/if}

			{#if getKojiGeofences() && isSupportedFeature("koji")}
				<GroupArea {searchQuery} />
			{/if}

			<Command.Separator class="bg-foreground/5 h-px w-full" />
		</Command.Viewport>
	</Command.List>
</Command.Root>
