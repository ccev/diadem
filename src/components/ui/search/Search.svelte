()
<script lang="ts">
	import { onMount } from "svelte";
	import { LoaderCircle, MapPin, Nut, Search, Squirrel, X } from "lucide-svelte";
	import * as m from "@/lib/paraglide/messages";
	import { closeSearchModal } from "@/lib/ui/modal.svelte.js";
	import Button from "@/components/ui/input/Button.svelte";
	import ModalTop from "@/components/ui/modal/ModalTop.svelte";
	import {
		type AnySearchEntry,
		getCurrentSearchQuery, getCurrentSearchResults, getIsSearchingAddress,
		search,
		setCurrentSearchQuery
	} from "@/lib/services/search.svelte";
	import { isSupportedFeature } from "@/lib/services/supportedFeatures";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import type { FuzzyResult } from "@nozbe/microfuzz";
	import SearchResults from "@/components/ui/search/SearchResults.svelte";
	import { Command } from "bits-ui";

	let input: HTMLInputElement | undefined = $state();

	onMount(() => {
		input?.focus();
	});

	let recentSearches: FuzzyResult<AnySearchEntry>[] = $derived(getUserSettings().recentSearches.map(i => {
		return { item: i, score: 0, matches: [] };
	}));

	let results = $derived(getCurrentSearchResults());

	$effect(() => {
		search(getCurrentSearchQuery(), true);
	});

	// const debounced = new Debounced(() => searchQuery, 80);
	// const results = $derived(search(debounced.current, true))
</script>

<ModalTop
	class="w-[calc(100%-1rem)]! max-w-2xl!"
	modalType="search"
	onopenchange={() => setCurrentSearchQuery("")}
>
	<Command.Root
		class="rounded-lg bg-card text-card-foreground max-h-[calc(100vh-1rem)] overflow-hidden"
		shouldFilter={false}
	>
		<div class="flex items-center border-b pb-px pr-px pl-2">
			<Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />

			<Command.Input
				bind:value={getCurrentSearchQuery, setCurrentSearchQuery}
				ref={input}
				placeholder={m.search_placeholder()}
				autocomplete="off"
				spellcheck="false"
				type="search"
				class="placeholder:text-muted-foreground flex h-11 w-full rounded-md bg-transparent py-3 pr-2 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
			/>

			<Button
				variant="ghost"
				size=""
				class="rounded-md p-2 mr-1"
				onclick={closeSearchModal}
			>
				<X size="20" class="opacity-50" />
			</Button>
		</div>

		<Command.List
			class="overflow-y-auto overflow-x-hidden mx-1 pb-1 max-h-200"
		>
			<Command.Viewport>
				{#if !getCurrentSearchQuery() && recentSearches.length > 0}
					<Command.Group>
						<Command.GroupHeading
							class="text-muted-foreground p-1 px-2 py-1.5 text-xs font-medium self-starts"
						>
							{m.search_recent()}
						</Command.GroupHeading>
						<Command.GroupItems>
							<SearchResults results={recentSearches} />
						</Command.GroupItems>
					</Command.Group>
					<!--this sometimes shows up even though there's results. extra check to avoid that-->
				{:else if results.length === 0 && !getIsSearchingAddress()}
					<Command.Empty>
						<div
							class="w-full flex gap-4 --justify-center items-center px-4 py-3 text-muted-foreground text-sm">
							{#if getCurrentSearchQuery()}
								<Nut size="24" class="rotate-24" />
							{:else}
								<Squirrel size="24" />
							{/if}

							<div>
								<p class="font-semibold">
									{#if getCurrentSearchQuery()}
										{m.nothing_found()}
									{:else}
										{m.nothing_to_see_here()}
									{/if}
								</p>
								<p>
									{#if isSupportedFeature("koji") && isSupportedFeature("geocoding")}
										{m.search_hint()}
									{:else if isSupportedFeature("koji")}
										{m.search_hint_no_area()}
									{:else if isSupportedFeature("geocoding")}
										{m.search_hint_no_address()}
									{:else}
										{m.search_hint_no_area_address()}
									{/if}
								</p>
							</div>
						</div>
					</Command.Empty>
				{/if}

				<Command.Group class="mt-1">
					<Command.GroupItems>
						<SearchResults {results} />
					</Command.GroupItems>
				</Command.Group>

				{#if getIsSearchingAddress()}
					<div class="py-1.5 px-2 text-sm text-muted-foreground flex gap-2 items-center animate-pulse duration-1000">
						<MapPin class="shrink-0" size="16" />

						<span>{m.searching_for_addresses()}</span>
					</div>
				{/if}
			</Command.Viewport>
		</Command.List>
	</Command.Root>
</ModalTop>

<style>
    :global(::highlight(search-highlight)) {
        background-color: var(--color-search-highlight);
    }
</style>