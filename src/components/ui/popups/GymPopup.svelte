<script lang="ts">
	import type { GymData } from '@/lib/types/mapObjectData/gym';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import { getIconGym, getIconPokemon, getIconRaidEgg } from '@/lib/uicons.svelte';
	import ImagePopup from '@/components/ui/popups/ImagePopup.svelte';
	import * as m from "@/lib/paraglide/messages"
	import ImageFort from '@/components/ui/popups/ImageFort.svelte';
	import { currentTimestamp, timestampToLocalTime } from '@/lib/utils.svelte';
	import { ingame, pokemonName } from '@/lib/ingameLocale';
	import Countdown from '@/components/utils/Countdown.svelte';
	import { getRaidPokemon } from '@/lib/pogoUtils';


	let {data} : {data: GymData} = $props()

</script>

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<ImageFort
			alt={data.name ?? m.pogo_gym()}
			fortUrl={data.url}
			fortIcon={getIconGym(data)}
			fortName={data.name}
		/>
	{/snippet}

	{#snippet title()}
		<div class="text-lg font-semibold tracking-tight">
			<span>
				{#if data.name}
					{data.name}
				{:else}
					{m.unknown_gym()}
				{/if}
			</span>
		</div>
	{/snippet}

	{#snippet description()}
		{#if (data.raid_end_timestamp ?? 0) > currentTimestamp()}
			<div class="flex gap-2 items-center">
				{#if data.raid_pokemon_id}
					<div class="w-8 flex-shrink-0">
						<ImagePopup
							src={getIconPokemon(getRaidPokemon(data))}
							alt={pokemonName(data.raid_pokemon_id, data.raid_pokemon_evolution)}
							class="w-8"
						/>
					</div>
				{:else}
					<div class="w-6 mx-1 flex-shrink-0">
						<ImagePopup
							src={getIconRaidEgg(data.raid_level ?? 0)}
							alt={ingame("raid_" + data.raid_level)}
							class="w-6"
						/>
					</div>
				{/if}


				<div>
					<div class="flex gap-1 items-center">
				<span class="font-semibold whitespace-nowrap">
					{ingame("raid_" + data.raid_level) || "Raid"}
				</span>

						{#if data.raid_pokemon_id}
					<span class="whitespace-nowrap">
						· {pokemonName(data.raid_pokemon_id, data.raid_pokemon_evolution)}
					</span>
						{/if}
					</div>
					<div>
				<span class="whitespace-nowrap">
					{#if (data.raid_battle_timestamp ?? 0) < currentTimestamp()}
						Ends
						<span class="font-semibold">
							<Countdown expireTime={data.raid_end_timestamp} />
						</span>
					{:else}
						Starts
						<span class="font-semibold">
							<Countdown expireTime={data.raid_battle_timestamp} />
						</span>
					{/if}
				</span>

						<span class="whitespace-nowrap">
					({timestampToLocalTime(data.raid_battle_timestamp)} –
							{timestampToLocalTime(data.raid_end_timestamp)})
				</span>
					</div>
				</div>

			</div>
		{/if}
	{/snippet}
</BasePopup>
