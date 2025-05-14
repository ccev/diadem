<script lang="ts">
	import { ingame } from '@/lib/ingameLocale.js';
	import { getCurrentWeather, updateCurrentWeatherFeatures } from '@/lib/mapObjects/weather.svelte.js';
	import Button from '@/components/ui/Button.svelte';
	import { getMap } from '@/lib/map/map.svelte';
	import { flyTo } from '@/lib/map/utils';
	import { untrack } from 'svelte';
	import TimeWithCountdown from '@/components/ui/popups/common/TimeWithCountdown.svelte';
	import { ArrowBigUpDash, Clock } from 'lucide-svelte';
	import IconValue from '@/components/ui/popups/common/IconValue.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { currentTimestamp, getWeatherIcon, timestampToLocalTime } from '@/lib/utils.svelte';
	import { closePopup } from '@/lib/mapObjects/interact';
	import { closeModal } from '@/lib/modal.svelte';
	import { slide } from 'svelte/transition';
	import { WEATHER_OUTDATED_SECONDS } from '@/lib/constants';
	import type { MasterWeather } from '@/lib/types/masterfile';
	import { getMasterWeather } from '@/lib/masterfile';
	import ImagePopup from '@/components/ui/popups/common/ImagePopup.svelte';
	import { getIconType } from '@/lib/uicons.svelte';

	let isClicked: boolean = $state(false)
	let boostedTypes: number[] = $derived(getMasterWeather(getCurrentWeather()?.gameplay_condition)?.types ?? [])

	$effect(() => {
		getCurrentWeather()
		untrack(() => {
			isClicked = false
			updateCurrentWeatherFeatures(false)
		})
	})

	function onClick() {
		isClicked = !isClicked

		const weather = getCurrentWeather()

		if (isClicked && weather) {
			closePopup()
			closeModal()
			getMap()?.flyTo({
				center: {
					lng: weather.longitude,
					lat: weather.latitude
				},
				zoom: 11.5,
				bearing: 0,
				pitch: 0,
				speed: 3
			})
			updateCurrentWeatherFeatures(true)
		} else if (!isClicked) {
			updateCurrentWeatherFeatures(false)
		}
	}
</script>

{#if getCurrentWeather() && getCurrentWeather().updated > currentTimestamp() - WEATHER_OUTDATED_SECONDS}
	<Button
		variant="ghost"
		size=""
		class="fixed z-10 top-2 left-2 px-4 py-3 text-sm bg-card flex-col! items-start! border rounded-lg shadow-lg hover:bg-accent hover:text-accent-foreground pointer-events-auto disabled:pointer-events-none"
		onclick={onClick}
	>
		<div>
			<IconValue Icon={getWeatherIcon(getCurrentWeather()?.gameplay_condition)}>
				{ingame("weather_" + getCurrentWeather()?.gameplay_condition)}
			</IconValue>
		</div>

		{#if isClicked}
			<div class="mt-2" transition:slide={{ duration: 70 }}>
				<IconValue Icon={ArrowBigUpDash}>
					{m.boosted()}:
				</IconValue>
				{#each boostedTypes as typeId}
					<div class="flex gap-2 mt-1">
						<div class="w-4 h-4 shrink-0">
							<ImagePopup
								alt={ingame("poke_type_" + typeId)}
								src={getIconType(typeId)}
								class="w-4 h-4"
							/>
						</div>

						<span>
							{ingame("poke_type_" + typeId)}
						</span>
					</div>
				{/each}

				<div class="h-3"></div>

				<IconValue Icon={Clock}>
					{m.last_changed()}: <b>{timestampToLocalTime(getCurrentWeather()?.updated)}</b>
				</IconValue>

			</div>
		{/if}
	</Button>
{/if}
