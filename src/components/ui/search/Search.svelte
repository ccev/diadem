<script lang="ts">
	import { Command } from "bits-ui";
	import { onMount } from 'svelte';
	import { Search } from 'lucide-svelte';
	import GroupArea from '@/components/ui/search/GroupArea.svelte';
	import GroupAddress from '@/components/ui/search/GroupAddress.svelte';
	import { isSupportedFeature } from '@/lib/enabledFeatures';
	import { getKojiGeofences } from '@/lib/koji';
	import * as m from '@/lib/paraglide/messages';

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
	<div class="flex items-center border-b px-2">
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
