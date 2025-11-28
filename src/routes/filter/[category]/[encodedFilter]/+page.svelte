<script lang="ts">
	import type { PageProps } from './$types';
	import { browser } from '$app/environment';
	import Metadata from '@/components/utils/Metadata.svelte';
	import * as m from '@/lib/paraglide/messages';
	import {
		getAttributeLabelCp,
		getAttributeLabelIvProduct,
		getAttributeLabelIvValues, getAttributeLabelLevel, getAttributeLabelRank, getAttributeLabelSize
	} from '@/lib/features/filters/filterUtilsPokemon';
	import type { FiltersetPokemon } from '@/lib/features/filters/filtersets';
	import { getGenderLabel } from '@/lib/utils/pokemonUtils';
	import { mPokemon } from '@/lib/services/ingameLocale';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { filterTitle } from '@/lib/features/filters/filtersetUtils';

	let { data }: PageProps = $props();

	let title = $derived.by(() => {
		if (browser || !data.category) return ""

		let title = ""

		if (data.category === "pokemon") {
			title += m.pokemon_filter()
		}

		if (title) title += " | " + filterTitle(data.filterset)

		return title
	})

	let text = $derived.by(() => {
		if (browser || !data.filterset || !data.category) return ""

		let text = ""
		if (data.category === "pokemon") {
			const filterset = data.filterset as FiltersetPokemon

			if (filterset.pokemon) {
				text += m.species() + ": "
				if (filterset.pokemon.length === 1) {
					text += mPokemon(filterset.pokemon[0]) + "\n"
				} else {
					text += m.count_pokemon({ count: filterset.pokemon.length }) + "\n"
				}
			}
			if (filterset.iv || filterset.ivAtk || filterset.ivDef || filterset.ivSta) {
				text += m.pogo_ivs() + ": "

				let valueText = ""
				if (filterset.ivAtk || filterset.ivDef || filterset.ivSta) {
					valueText = getAttributeLabelIvValues(filterset.ivAtk, filterset.ivDef, filterset.ivSta)
				}

				if (filterset.iv) {
					text += getAttributeLabelIvProduct(filterset.iv)
					if (valueText) text += `(${valueText})`
				} else {
					text += valueText
				}

				text += "\n"
			}
			if (filterset.cp) {
				text += `${m.cp()}: ${getAttributeLabelCp(filterset.cp)}\n`
			}
			if (filterset.level) {
				text += `${m.level()}: ${getAttributeLabelLevel(filterset.level)}\n`
			}
			if (filterset.pvpRankLittle) {
				text += `${m.little_league()}: ${getAttributeLabelRank(filterset.pvpRankLittle)}\n`
			}
			if (filterset.pvpRankGreat) {
				text += `${m.great_league()}: ${getAttributeLabelRank(filterset.pvpRankGreat)}\n`
			}
			if (filterset.pvpRankUltra) {
				text += `${m.ultra_league()}: ${getAttributeLabelRank(filterset.pvpRankUltra)}\n`
			}
			if (filterset.size) {
				text += `${m.pokemon_size()}: ${getAttributeLabelSize(filterset.size)}\n`
			}
			if (filterset.gender) {
				text += `${m.pokemon_gender()}: ${filterset.gender.map(getGenderLabel).join(", ")}\n`
			}

			return text
		}
	})

	onMount(() => {
		goto('/');
	});
</script>

<svelte:head>
	{#if !browser && data}
		<Metadata
			title={title}
			embedTitle={title}
			description={text}
		/>
	{/if}
</svelte:head>
