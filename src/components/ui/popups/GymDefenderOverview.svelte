<script lang="ts">
	import { getIconPokemon } from '@/lib/uicons.svelte';
	import { pokemonName } from '@/lib/ingameLocale';
	import Button from '@/components/ui/Button.svelte';
	import ImagePopup from '@/components/ui/popups/ImagePopup.svelte';
	import type { GymDefender } from '@/lib/types/mapObjectData/gym';
	import Countdown from '@/components/utils/Countdown.svelte';
	import TextSeparator from '@/components/utils/TextSeparator.svelte';
	import * as m from "@/lib/paraglide/messages"
	import IconValue from '@/components/ui/popups/IconValue.svelte';
	import { Candy, Heart, HeartPulse, Shield, Swords } from 'lucide-svelte';
	import { slide } from 'svelte/transition';

	let { defenders }: { defenders: GymDefender[] } = $props()

	let selectedDefender: GymDefender | undefined = $state(undefined)

	function getDefenderId(defender: GymDefender | undefined) {
		if (!defender) return "-"
		return "" + defender.pokemon_id + "-" + defender.form + "-" + defender.deployed_time
	}

	function selectDefender(defender: GymDefender) {
		if (!selectedDefender) {
			selectedDefender = defender
			return
		}

		if (getDefenderId(selectedDefender) === getDefenderId(defender)) {
			selectedDefender = undefined
			return
		}

		selectedDefender = defender
	}
</script>

{#if defenders}
<div class="flex gap-1 my-1 flex-wrap border-border border-b pb-2">
	{#each defenders as defender (getDefenderId(defender))}
		<Button
			variant="outline"
			size=""
			class="p-2 rounded-sm {getDefenderId(defender) === getDefenderId(selectedDefender) ? 'bg-accent' : ''}"
			onclick={() => selectDefender(defender)}
		>
			<ImagePopup
				src={getIconPokemon(defender)}
				alt={pokemonName(defender.pokemon_id)}
				class="w-5"
			/>
		</Button>
	{/each}

	{#if selectedDefender}
		<div
			class="py-1 px-3 border-border border rounded-sm w-full bg-accent"
			transition:slide={{ duration: 90 }}
		>
			<div>
				<b>{pokemonName(selectedDefender.pokemon_id)}</b>
				<TextSeparator />
				{m.pogo_cp({ cp: selectedDefender.cp_now + "/" + selectedDefender.cp_when_deployed })}

				<span class="whitespace-nowrap">
				(<Heart size="16" class="inline-block mb-0.5 mr-0.5" />{Math.round(selectedDefender.motivation_now * 100)}%)
				</span>
			</div>
			<div class="flex gap-x-4 gap-y-0 whitespace-nowrap flex-wrap">
				<IconValue Icon={Candy}>{selectedDefender.times_fed}x fed</IconValue>
				<IconValue Icon={Swords}>{selectedDefender.battles_won}x won</IconValue>
				<IconValue Icon={Shield}>{selectedDefender.battles_lost}x lost</IconValue>
			</div>
			Placed <Countdown expireTime={selectedDefender.deployed_time} />
		</div>
	{/if}
</div>
{/if}