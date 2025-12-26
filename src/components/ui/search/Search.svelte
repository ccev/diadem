<script lang="ts">
	import { Command } from 'bits-ui';
	import { onMount } from 'svelte';
	import { Search, X } from 'lucide-svelte';
	import GroupArea from '@/components/ui/search/GroupArea.svelte';
	import GroupAddress from '@/components/ui/search/GroupAddress.svelte';
	import { isSupportedFeature } from '@/lib/services/supportedFeatures';
	import { getKojiGeofences } from '@/lib/features/koji';
	import * as m from '@/lib/paraglide/messages';
	import { closeModal, isOpenModal } from "@/lib/ui/modal.svelte.js";
	import Button from '@/components/ui/input/Button.svelte';
	import Modal from '@/components/ui/modal/Modal.svelte';
	import ModalTop from '@/components/ui/modal/ModalTop.svelte';
	import SearchGroup from "@/components/ui/search/SearchGroup.svelte";
	import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
	import GroupGym from "@/components/ui/search/GroupGym.svelte";
	import { Debounced, watch } from "runed";
	import GroupPokestop from "@/components/ui/search/GroupPokestop.svelte";
	import { searchPokemon } from "@/lib/services/search.svelte";
	import type { PokemonLocaleName } from "@/lib/services/ingameLocale";
	import GroupPokemon from "@/components/ui/search/GroupPokemon.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

	let input: HTMLInputElement | undefined = $state();
	let searchQuery: string = $state('');

	onMount(() => {
		input?.focus();
		searchQuery = ""
	})

	const debounced = new Debounced(() => searchQuery, 100);
</script>

<ModalTop modalType="search">
	<Command.Root
		class="rounded-lg border bg-card text-card-foreground max-h-[calc(100vh-1rem)] overflow-hidden"
		shouldFilter={false}
	>
		<div class="flex items-center border-b pb-px pr-px pl-2">
			<Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />

			<Command.Input
				bind:value={searchQuery}
				ref={input}
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
				onclick={() => closeModal("search")}
			>
				<X size="20" class="opacity-50" />
			</Button>
		</div>

		<Command.List
			class="overflow-y-auto overflow-x-hidden mx-1 pb-1 max-h-200"
		>
			<Command.Viewport>
				{#if getKojiGeofences() && isSupportedFeature("koji")}
					<GroupArea {searchQuery} />
				{/if}

				{#if isSupportedFeature("geocoding")}
					<GroupAddress {searchQuery} />
				{/if}

				{#if hasFeatureAnywhere(getUserDetails().permissions, MapObjectType.POKEMON)}
					<GroupPokemon {searchQuery} />
				{/if}

				{#if hasFeatureAnywhere(getUserDetails().permissions, MapObjectType.POKESTOP)}
					<GroupPokestop {searchQuery} />
				{/if}

				{#if hasFeatureAnywhere(getUserDetails().permissions, MapObjectType.GYM)}
					<GroupGym {searchQuery} />
				{/if}

				<Command.Separator class="bg-foreground/5 h-px w-full" />
			</Command.Viewport>
		</Command.List>
	</Command.Root>
</ModalTop>