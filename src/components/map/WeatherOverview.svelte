<script lang="ts">
	import { ingame } from '@/lib/ingameLocale.js';
	import { getCurrentWeather, updateCurrentWeatherFeatures, updateWeather } from '@/lib/mapObjects/weather.svelte.js';
	import Button from '@/components/ui/basic/Button.svelte';
	import { getMap } from '@/lib/map/map.svelte';
	import { untrack } from 'svelte';
	import { ArrowBigUpDash, Clock } from 'lucide-svelte';
	import IconValue from '@/components/ui/popups/common/IconValue.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { currentTimestamp, getWeatherIcon, timestampToLocalTime } from '@/lib/utils.svelte';
	import { closePopup } from '@/lib/mapObjects/interact';
	import { closeModal } from '@/lib/modal.svelte';
	import { slide } from 'svelte/transition';
	import { WEATHER_OUTDATED_SECONDS } from '@/lib/constants';
	import { getMasterWeather } from '@/lib/masterfile';
	import ImagePopup from '@/components/ui/popups/common/ImagePopup.svelte';
	import { getIconType } from '@/lib/uicons.svelte';
	import { watch } from 'runed';
	import type { WeatherData } from '@/lib/types/mapObjectData/weather';
	import { getUserSettings } from '@/lib/userSettings.svelte';
	import { isMenuSidebar, isUiLeft, openMenu } from '@/lib/menus.svelte';

	let ignoreWatch = false
	let isClicked: boolean = $state(false)
	let boostedTypes: number[] = $derived(getMasterWeather(getCurrentWeather()?.gameplay_condition)?.types ?? [])

	watch(
		() => getCurrentWeather(),
		() => {
			if (ignoreWatch) return
			isClicked = false
			updateCurrentWeatherFeatures(false)
		}
	)

	async function onClick() {
		isClicked = !isClicked
		openMenu(null)

		if (isClicked && getMap()?.isMoving()) {
			ignoreWatch = true
			await updateWeather()
			ignoreWatch = false
		}

		const weather = getCurrentWeather()

		if (isClicked && weather && isWeatherUpdated(weather)) {
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

	function isWeatherUpdated(weather: WeatherData | undefined) {
		return (weather?.updated ?? 0) > currentTimestamp() - WEATHER_OUTDATED_SECONDS
	}
</script>

{#if getCurrentWeather() && isWeatherUpdated(getCurrentWeather())}
	<div
		class="pointer-events-none fixed top-2 z-10"
		class:right-2={!isUiLeft() || isMenuSidebar()}
		class:left-2={isUiLeft() && !isMenuSidebar()}
	>
		<Button
			variant="ghost"
			size=""
			class="pointer-events-auto px-4 py-3 text-sm bg-card flex-col! items-start! border rounded-lg shadow-lg hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground disabled:pointer-events-none"
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
						<div class="flex gap-2 mt-1 items-center">
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
	</div>
{/if}
