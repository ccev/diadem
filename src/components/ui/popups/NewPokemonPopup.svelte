<script lang="ts">
	import { Drawer } from "diadem-vaul-svelte";
	import { getMapObjects } from "$lib/mapObjects/mapObjectsState.svelte";
	import { getCurrentSelectedData, getCurrentSelectedMapId } from "$lib/mapObjects/currentSelectedState.svelte";
	import { useMetadata } from "$lib/ui/metadata.svelte";
	import * as m from "$lib/paraglide/messages";
	import { getIconPokemon } from "$lib/services/uicons.svelte";
	import PopupButtons from "@/components/ui/popups/common/PopupButtons.svelte";
	import { backupShareUrl, canNativeShare, copyToClipboard, hasClipboardWrite } from "$lib/utils/device";
	import Button from "@/components/ui/input/Button.svelte";
	import {
		Apple,
		BicepsFlexed, ChartColumn,
		ChartSpline,
		ChevronDown,
		CircleDot, CircleSmall,
		Clock,
		Copy, Crown, Flower, HatGlasses,
		Info, Mars, Navigation, Ruler,
		Search,
		Share2, Sparkles,
		SquareChartGantt, Sword, Swords, Venus,
		X
	} from "lucide-svelte";
	import { getRootOrigin } from "$lib/native/runtime";
	import { getCurrentPath } from "$lib/mapObjects/interact";
	import { getLocale } from "$lib/paraglide/runtime";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import { mMove, mPokemon } from "$lib/services/ingameLocale";
	import QuestIcon from "@/components/icons/QuestIcon.svelte";
	import InvasionIcon from "@/components/icons/InvasionIcon.svelte";
	import { getPokemonStats as getMasterPokemonStats, type PokemonStats } from "$lib/features/masterStats.svelte";
	import { getMapStyle, mapStyleFromId } from "$lib/utils/mapStyle";
	import { getUserSettings } from "$lib/services/userSettings.svelte";
	import { getConfig } from "$lib/services/config/config";
	import { CircleLayer, GeoJSON, MapLibre, Marker } from "svelte-maplibre";
	import { MapSourceId } from "$lib/map/layers";
	import { point } from "@turf/turf";
	import Countdown from "@/components/utils/Countdown.svelte";
	import type { PokemonData } from "$lib/types/mapObjectData/pokemon";
	import { isPointInAllowedArea } from "$lib/services/user/checkPerm";
	import { getUserDetails } from "$lib/services/user/userDetails.svelte";
	import { Features } from "$lib/utils/features";
	import type { FilterPokemon } from "$lib/features/filters/filters";
	import { POKEMON_MIN_RANK } from "$lib/constants";
	import { formatNumber, formatNumberCompact, formatPercentage, formatRatio } from "$lib/utils/numberFormat";
	import {
		getBestRank,
		getPokemonSize, getRarityLabel,
		hasTimer,
		League,
		showGreat,
		showLittle,
		showUltra
	} from "$lib/utils/pokemonUtils";
	import { Meter } from "bits-ui";
	import { slide, fly } from "svelte/transition";
	import { getLoadingProgress } from "$lib/services/initialLoad.svelte";
	import PartlyCloudy from "@/components/icons/weather/PartlyCloudy.svelte";
	import { resize } from "$lib/services/assets";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import { getMapsUrl } from "$lib/utils/mapUrl";
	import { Coords } from "$lib/utils/coordinates";
	import { getShareTitle } from "$lib/features/shareTexts";
	import PopupButton from "@/components/ui/popups/common/PopupButton.svelte";
	import TimeWithCountdown from "@/components/ui/popups/common/TimeWithCountdown.svelte";

	let data: PokemonData = $derived(
		(getMapObjects()[getCurrentSelectedMapId()] as PokemonData) ??
		(getCurrentSelectedData() as PokemonData)
	);
	useMetadata(() => ({ title: data ? mPokemon(data) : undefined }));

	const snapPoints = ["250px", 1];
	let activeSnapPoint: number | string = $state(snapPoints[0]);

	let showIvBreakdown: boolean = $state(false);

	let canSeeIv = $derived(
		data &&
		isPointInAllowedArea(getUserDetails().permissions, Features.POKEMON_IV, data.lat, data.lon)
	);

	let stats: PokemonStats | undefined = $derived(
		getMasterPokemonStats(data.pokemon_id, data.form ?? 0)
	);

	function getMaxPvpRank(
		filterAttribute: "pvpRankLittle" | "pvpRankGreat" | "pvpRankUltra",
		filter: FilterPokemon
	) {
		const ranks = [POKEMON_MIN_RANK];
		const filters = filter.filters.filter((f) => f.enabled);
		for (const filter of filters) {
			if (filter[filterAttribute]) {
				ranks.push(filter[filterAttribute].max);
			}
		}
		return Math.max(...ranks);
	}

	let maxLittleRank = $derived(getMaxPvpRank("pvpRankLittle", getUserSettings().filters.pokemon));
	let maxGreatRank = $derived(getMaxPvpRank("pvpRankGreat", getUserSettings().filters.pokemon));
	let maxUltraRank = $derived(getMaxPvpRank("pvpRankUltra", getUserSettings().filters.pokemon));

	function getShareUrl() {
		return getRootOrigin() + getCurrentPath() + "?lang=" + getLocale();
	}
</script>

<Drawer.Root
	open={true}
	onOpenChangeComplete={() => {}}
	closeOnOutsideClick={false}
	{snapPoints}
	bind:activeSnapPoint
>
	<Drawer.Portal>
		<Drawer.Content
			class="duration-150! fixed flex flex-col bottom-0 z-50 w-full h-full rounded-t-xl border border-t-border bg-card pb-[env(safe-area-inset-bottom)]"
		>
			<div class="w-10 mx-auto my-3 rounded-full bg-ring h-1 shrink-0"></div>
			<div class="flex gap-6 px-4">
				<div class="w-14 shrink-0">
					<ImagePopup alt={mPokemon(data)} src={getIconPokemon(data)} class="size-14" />
				</div>
				<div>
					<p class="text-muted-foreground text-sm font-medium">
						Wild Pokemon
					</p>
					<h1 class="font-semibold text-xl">
						{mPokemon(data)}
					</h1>
				</div>


				<div class="absolute right-2 top-3 flex gap-1.5">
					{#if canNativeShare({ url: getShareUrl() })}
						<Button
							variant="ghost"
							size=""
							class="rounded-full size-8 p-2"
							title={m.popup_share()}
							onclick={() => backupShareUrl(getShareUrl())}
						>
							<Share2 class="size-3.5" />
						</Button>
					{:else if hasClipboardWrite()}
						<Button
							variant="ghost"
							size=""
							class="rounded-full size-8 p-2"
							title={m.copy_link()}
							onclick={() => copyToClipboard(getShareUrl())}
						>
							<Copy class="size-3.5" />
						</Button>
					{/if}

					<Button
						variant="ghost"
						size=""
						class="rounded-full p-2 size-8"
						title={m.close()}
						onclick={onclose}
					>
						<X class="size-4.5" />
					</Button>
				</div>
			</div>

			{#if activeSnapPoint !== 1}

				<div class="mt-4 w-full">
					<div class="overflow-x-auto flex *:shrink-0 gap-2 px-4">
						<div class="border bg-accent border-border rounded-lg px-4 py-2">
							<p class="flex items-center gap-1 text-muted-foreground text-sm font-semibold">
								{#if hasTimer(data)}
									{m.popup_despawns()}
								{:else}
									{m.popup_found()}
								{/if}
							</p>
							<p
								class="font-semibold text-xl"
							>
								<Countdown
									expireTime={hasTimer(data) ? data.expire_timestamp : data.first_seen_timestamp}
								/>
							</p>
						</div>

						<div class="border bg-accent border-border rounded-lg px-4 py-2">
							{#if data.iv || data.iv === 0}
								<p class="flex items-center gap-1 text-muted-foreground text-sm font-semibold">
									{m.pogo_ivs()}
								</p>
								<p
									class="font-semibold text-xl"
									class:text-tier-0={data.iv <= 50}
									class:text-tier-1={data.iv > 50 && data.iv <= 75}
									class:text-tier-2={data.iv > 75 && data.iv < 90}
									class:text-tier-3={data.iv >= 90 && data.iv <= 99}
									class:text-tier-4={data.iv > 99}
								>
									{formatPercentage(data.iv / 100, { minDecimals: 0 })}
								</p>
							{/if}
						</div>

						{#if showLittle(data)}
							<div class="border bg-accent border-border rounded-lg px-4 py-2">
								<p class="flex items-center gap-1 text-muted-foreground text-sm font-semibold">
									{m.little_league()}
								</p>
								<p
									class="font-semibold text-xl"
								>
									#{getBestRank(data, League.LITTLE)}
								</p>
							</div>
						{/if}

						{#if showGreat(data)}
							<div class="border bg-accent border-border rounded-lg px-4 py-2">
								<p class="flex items-center gap-1 text-muted-foreground text-sm font-semibold">
									{m.great_league()}
								</p>
								<p
									class="font-semibold text-xl"
								>
									#{getBestRank(data, League.GREAT)}
								</p>
							</div>
						{/if}

						{#if showUltra(data)}
							<div class="border bg-accent border-border rounded-lg px-4 py-2">
								<p class="flex items-center gap-1 text-muted-foreground text-sm font-semibold">
									{m.ultra_league()}
								</p>
								<p
									class="font-semibold text-xl"
								>
									#{getBestRank(data, League.ULTRA)}
								</p>
							</div>
						{/if}

						<div class="border bg-accent border-border rounded-lg px-4 py-2">
							{#if data.cp != null}
								<p class="flex items-center gap-1 text-muted-foreground text-sm font-semibold">
									{m.cp()}
								</p>
								<p
									class="font-semibold text-xl"
								>
									{data.cp}
								</p>
							{/if}
						</div>

						<div class="border bg-accent border-border rounded-lg px-4 py-2">
							{#if data.level != null}
								<p class="flex items-center gap-1 text-muted-foreground text-sm font-semibold">
									{m.level()}
								</p>
								<p
									class="font-semibold text-xl"
								>
									{data.level}
								</p>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<div class="mt-5">
				{#if activeSnapPoint === 1}
					<PopupButton
						class="mx-4 w-full"
						variant="default"
						Icon={Navigation}
						label={m.popup_navigate()}
						tag="a"
						href={getMapsUrl(new Coords(data.lat, data.lon), getShareTitle(getCurrentSelectedData()))}
						target="_blank"
					/>
				{:else}
					<PopupButtons lat={data.lat} lon={data.lon} />
				{/if}
			</div>

			<div class="px-4 pt-2 mt-2 pb-6 space-y-6 overflow-y-auto">
				<!--				<h2 class="mb-2 flex items-center gap-1.5 font-semibold">-->
				<!--&lt;!&ndash;					<CircleDot class="size-3.5" />&ndash;&gt;-->
				<!--					This {mPokemon({ pokemon_id: data.pokemon_id })} is-->
				<!--				</h2>-->

				<div class="bg-accent text-accent-foreground px-4 py-4 border border-border rounded-lg">
					<p class="font-semibold ml-1">
						Disappear Time
					</p>

					<div class="flex justify-between text-xl mt-4 items-center gap-4">
						<div class="justify-center font-semibold flex gap-2 items-center rounded-md bg-neutral-800 pl-4 pr-6 py-2 w-full">
							<Clock class="size-4" />
							<p>
								{timestampToLocalTime(data.expire_timestamp, false, true)}
							</p>
						</div>

						<div class="justify-center font-semibold flex gap-2 items-center rounded-md bg-neutral-800 pl-4 pr-6 py-2 w-full">
<!--							<Clock class="size-4" />-->
							<Countdown expireTime={data.expire_timestamp} />
						</div>




					</div>
				</div>

				<div class="bg-accent text-accent-foreground px-4 py-4 border border-border rounded-lg">
					<div class="space-y-3">
						<div class="flex justify-between">
							<div class="flex gap-1.5 items-center">
								<PartlyCloudy class="size-3.5" />
								Weather Boosted
							</div>
							<div class="text-muted-foreground">
								Partly Cloudy
							</div>
						</div>

						<div class="flex justify-between">
							<div class="flex gap-1.5 items-center">
								<Ruler class="size-3.5" />
								Large
							</div>
							<div class="text-muted-foreground">
								XXL
							</div>
						</div>

						<div class="flex justify-between">
							<div class="flex gap-1.5 items-center">
								<BicepsFlexed class="size-3.5" />
								Mighty
							</div>
						</div>

						{#if data.display_pokemon_id}
							{@const displayPokemon = {
								pokemon_id: data.display_pokemon_id,
								form: data.display_pokemon_form
							}}
							<div class="flex justify-between">
								<div class="flex gap-1.5 items-center">
									<HatGlasses class="size-3.5" />
									Disguised as
								</div>
								<div class="text-muted-foreground items-center flex gap-2">
									<ImagePopup
										class="size-6 shrink-0"
										src={resize(getIconPokemon(displayPokemon), { width: 64 })}
										alt={mPokemon(displayPokemon)}
									/>
									{mPokemon(displayPokemon)}
								</div>
							</div>
						{/if}

						<div class="flex justify-between">
							<div class="flex gap-1.5 items-center">
								<Flower class="size-3.5" />
								From a Lure Module
							</div>
						</div>

						<div class="flex justify-between">
							<div class="flex gap-1.5 items-center">
								<Apple class="size-3.5" />
								Appears after tapping an apple
							</div>
						</div>
					</div>


				</div>

				<h2 class="mb-2 flex items-center gap-1.5 font-semibold">
					<SquareChartGantt class="size-3.5" />
					Values
				</h2>

				<div class="space-y-3 bg-accent text-accent-foreground px-4 py-4 border border-border rounded-lg">
					{#if data.iv || data.iv === 0}
						<div>
							<button
								class="flex justify-between w-full"
								onclick={() => showIvBreakdown = !showIvBreakdown}
							>
								<p class="text-muted-foreground">
									Total IV
								</p>
								<div class="flex items-center">
									<ChevronDown class="size-3.5 mr-2" />
									<p
										class:text-tier-0={data.iv <= 50}
										class:text-tier-1={data.iv > 50 && data.iv <= 75}
										class:text-tier-2={data.iv > 75 && data.iv < 90}
										class:text-tier-3={data.iv >= 90 && data.iv <= 99}
										class:text-tier-4={data.iv > 99}
									>
										{formatPercentage(data.iv / 100, { minDecimals: 2, maxDecimals: 2 })}
									</p>
								</div>
							</button>
							{#if showIvBreakdown}
								<div class="mt-3 mb-4 space-y-1" transition:slide={{ duration: 110 }}>
									<div class="flex justify-between">
										<p class="text-muted-foreground">
											Attack
										</p>
										<div class="flex items-center">
											<Meter.Root
												min={0}
												max={15}
												value={data.atk_iv}
												class="h-1 overflow-hidden w-32 rounded-full bg-neutral-700"
											>
												<div
													class="h-full w-full flex-1 bg-foreground rounded-full"
													style="transform: translateX(-{100 - ((data?.atk_iv ?? 0) / 15) * 100}%)"
												></div>
											</Meter.Root>
											<p class="w-8 text-right">
												{data.atk_iv}
											</p>
										</div>

									</div>
									<div class="flex justify-between">
										<p class="text-muted-foreground">
											Defense
										</p>
										<div class="flex items-center">
											<Meter.Root
												min={0}
												max={15}
												value={data.def_iv}
												class="h-1 overflow-hidden w-32 rounded-full bg-neutral-700"
											>
												<div
													class="h-full w-full flex-1 bg-foreground rounded-full"
													style="transform: translateX(-{100 - ((data?.def_iv ?? 0) / 15) * 100}%)"
												></div>
											</Meter.Root>
											<p class="w-8 text-right">
												{data.def_iv}
											</p>
										</div>

									</div>
									<div class="flex justify-between">
										<p class="text-muted-foreground">
											Stamina
										</p>
										<div class="flex items-center">
											<Meter.Root
												min={0}
												max={15}
												value={data.sta_iv}
												class="h-1 overflow-hidden w-32 rounded-full bg-neutral-700"
											>
												<div
													class="h-full w-full flex-1 bg-foreground rounded-full"
													style="transform: translateX(-{100 - ((data?.sta_iv ?? 0) / 15) * 100}%)"
												></div>
											</Meter.Root>
											<p class="w-8 text-right">
												{data.sta_iv}
											</p>
										</div>

									</div>
								</div>
							{/if}
						</div>
					{/if}

					{#if data.cp}
						<div class="flex justify-between">
							<p class="text-muted-foreground">
								{m.cp()}
							</p>
							<p>
								{data.cp}
							</p>
						</div>
					{/if}
					{#if data.level}
						<div class="flex justify-between">
							<p class="text-muted-foreground">
								{m.level()}
							</p>
							<p>
								{data.level}
							</p>
						</div>
					{/if}
				</div>

				<div class="flex justify-between gap-2 items-center mb-2">
					<h2 class="flex items-center gap-1.5 font-semibold">
						<ChartColumn class="size-3.5" />
						Stats
					</h2>

					{#if stats && stats.entry}
						{@const entry = stats.entry}

						<p class="text-sm text-muted-foreground">
							{m.last_x_days({ days: formatNumber(stats.total.days) })}
							· {m.total_seen()}: {formatNumberCompact(entry?.shiny?.total ?? entry?.spawns?.count)}
						</p>
					{/if}
				</div>

				<div>
					<div class="space-y-3 bg-accent text-accent-foreground px-4 py-4 border border-border rounded-lg">
						{#if stats && stats.entry}
							{@const entry = stats.entry}

							<div class="flex justify-between">
								<div class="flex gap-1.5 text-muted-foreground items-center">
									<Sparkles class="size-3.5" />
									{#if entry.shiny && entry.shiny.shinies > 0}
										{m.shiny_rate()}
									{:else}
										{m.contest_shiny()}
									{/if}
								</div>
								{#if entry.shiny && entry.shiny.shinies > 0}
									{formatRatio(entry.shiny.shinies, entry.shiny.total)}
								{:else}
									Unavailable
								{/if}
							</div>

							<div class="flex justify-between">
								<div class="flex gap-1.5 text-muted-foreground items-center">
									<Crown class="size-3.5" />
									{m.rarity()}
								</div>
								{#if entry.spawns && entry.spawns.count > 0}
									<p class="flex gap-2">
										<span
											class="text-muted-foreground">{formatRatio(entry.spawns.count, stats.total.count)}</span>
										<span class="text-muted-foreground">·</span>
										<span>{getRarityLabel(entry.spawns.count, stats.total.count)}</span>
									</p>
								{:else}
									Unavailable
								{/if}
							</div>
						{:else}
							Stats unavailable for this {mPokemon({ pokemon_id: data.pokemon_id })}
						{/if}
					</div>
				</div>

				<h2 class="mb-2 flex items-center gap-1.5 font-semibold">
					<CircleDot class="size-3.5" />
					Access this {mPokemon({ pokemon_id: data.pokemon_id })}
				</h2>

				<MapLibre
					center={[data.lon, data.lat]}
					zoom={17}
					style={getMapStyle(mapStyleFromId(getUserSettings().mapStyle.id))}
					class="w-full h-46 border border-border rounded-lg"
					attributionControl={false}
					minZoom={getConfig().general.minZoom}
					maxZoom={getConfig().general.maxZoom}
				>
					<Marker lngLat={[data.lon, data.lat]} class="size-8">
						<ImagePopup alt={mPokemon(data)} src={getIconPokemon(data)} />
					</Marker>

					<GeoJSON
						id={MapSourceId.MAP_OBJECTS}
						data={point([data.lon, data.lat])}
					>
						<CircleLayer
							id="changelater3h298"
							paint={{
							"circle-radius": 60,
							"circle-color": "rgba(200, 200, 200, 0.1)",
							"circle-stroke-width": 1,
							"circle-stroke-color": "rgba(200, 200, 200, 0.3)"
						}}
							eventsIfTopMost={true}
						/>
					</GeoJSON>


				</MapLibre>

				<h2 class="mb-2 flex items-center gap-1.5 font-semibold">
					<Info class="size-3.5" />
					About this {mPokemon({ pokemon_id: data.pokemon_id })}
				</h2>

				<div class="space-y-3 bg-accent text-accent-foreground px-4 py-4 border border-border rounded-lg">
					<div class="flex justify-between">
						<div class="flex gap-1.5 text-muted-foreground items-center">
							{#if data.gender === 1}
								<Mars class="size-3.5" />
							{:else if data.gender === 2}
								<Venus class="size-3.5" />
							{:else}
								<CircleSmall class="size-3.5" />
							{/if}
							{m.pokemon_gender()}
						</div>
						{#if data.gender != null}
							{#if data.gender === 1}
								{m.pokemon_gender_male()}
							{:else if data.gender === 2}
								{m.pokemon_gender_female()}
							{:else}
								{m.pokemon_gender_neutral()}
							{/if}
						{:else}
							<span class="text-muted-foreground">
								unknown
							</span>
						{/if}
					</div>

					<div class="flex justify-between">
						<div class="flex gap-1.5 text-muted-foreground items-center">
							<Ruler class="size-3.5" />
							{m.pokemon_size()}
						</div>
						{#if data.size != null}
							{getPokemonSize(data.size)}
						{:else}
							<span class="text-muted-foreground">
								unknown
							</span>
						{/if}
					</div>

					<div class="flex justify-between">
						<div class="flex gap-1.5 text-muted-foreground items-center">
							<Swords class="size-3.5" />
							{m.popup_pokemon_moves()}
						</div>
						<p class="flex gap-2">
							{#if data.move_1 && data.move_2}
								<span>{mMove(data.move_1)}</span>
								<span>·</span>
								<span>{mMove(data.move_2)}</span>
							{:else}
								<span class="text-muted-foreground">
									unknown
								</span>
							{/if}
						</p>

					</div>
					<div class="flex justify-between">
						<div class="flex gap-1.5 text-muted-foreground items-center">
							<Clock class="size-3.5" />
							{m.last_seen()}
						</div>
						<Countdown expireTime={data.updated} />
					</div>
					<div class="flex justify-between">
						<div class="flex gap-1.5 text-muted-foreground items-center">
							<Search class="size-3.5" />
							{m.first_seen()}
						</div>
						{timestampToLocalTime(data.first_seen_timestamp, true)}
					</div>
				</div>
			</div>


		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>

<style>
    :global(.drawer-full) {
        /* Only inset for the status bar when the drawer is expanded to the top;
		   at the partial snap point it sits below the status bar already. */
        padding-top: calc(0.5rem + env(safe-area-inset-top)) !important;

        & .content {
            overflow-y: auto;
        }
    }

    :global(.drawer-partial) {
        border-top-left-radius: calc(var(--radius) + 4px);
        border-top-right-radius: calc(var(--radius) + 4px);

        & .content {
            overflow-y: hidden;
        }
    }
</style>