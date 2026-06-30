<script lang="ts">
	import { Drawer } from "diadem-vaul-svelte";
	import { getOpenedMenu, onMenuDrawerOpenChangeComplete } from "$lib/ui/menus.svelte";
	import MenuContainer from "@/components/menus/MenuContainer.svelte";
	import MobileTitle from "@/components/menus/mobile/MobileTitle.svelte";
	import type { Incident, PokestopData } from "$lib/types/mapObjectData/pokestop";
	import { getMapObjects } from "$lib/mapObjects/mapObjectsState.svelte";
	import { getCurrentSelectedData, getCurrentSelectedMapId } from "$lib/mapObjects/currentSelectedState.svelte";
	import { useMetadata } from "$lib/ui/metadata.svelte";
	import * as m from "$lib/paraglide/messages";
	import { getIconInvasion, getIconPokemon, getIconPokestop, getIconReward } from "$lib/services/uicons.svelte";
	import FortImage from "@/components/ui/popups/common/FortImage.svelte";
	import PopupButtons from "@/components/ui/popups/common/PopupButtons.svelte";
	import { backupShareUrl, canNativeShare, copyToClipboard, hasClipboardWrite } from "$lib/utils/device";
	import Button from "@/components/ui/input/Button.svelte";
	import {
		CircleDot,
		Clock,
		ClockArrowUp,
		Copy, Globe,
		Info, MapPin, Medal,
		Rat,
		Search,
		Share2, Signpost,
		Sword,
		Target,
		Trophy,
		X
	} from "@lucide/svelte";
	import { getRootOrigin } from "$lib/native/runtime";
	import { getCurrentPath } from "$lib/mapObjects/interact";
	import { getLocale } from "$lib/paraglide/runtime";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import { mCharacter, mPokemon, mQuest } from "$lib/services/ingameLocale";
	import {
		getRewardText,
		isIncidentContest,
		isIncidentInvasion,
		isIncidentKecleon,
		KECLEON_ID
	} from "$lib/utils/pokestopUtils";
	import QuestIcon from "@/components/icons/QuestIcon.svelte";
	import { currentTimestamp } from "$lib/utils/currentTimestamp";
	import { shouldDisplayIncident } from "$lib/features/filterLogic/pokestop";
	import InvasionIcon from "@/components/icons/InvasionIcon.svelte";
	import {
		getInvasionCatchable,
		getInvasionLineup,
		getInvasionPokemon,
		hasInvasionLineup
	} from "$lib/features/masterStats.svelte";
	import TimeWithCountdown from "@/components/ui/popups/common/TimeWithCountdown.svelte";
	import { getMapStyle, mapStyleFromId } from "$lib/utils/mapStyle";
	import { getUserSettings } from "$lib/services/userSettings.svelte";
	import { isAnyModalOpen } from "$lib/ui/modal.svelte";
	import { getConfig } from "$lib/services/config/config";
	import { MapLibre, Marker, CircleLayer, GeoJSON } from "svelte-maplibre";
	import { MapObjectLayerId, MapSourceId } from "$lib/map/layers";
	import { FeatureTypes } from "$lib/map/render/featureTypes";
	import { feature, featureCollection, point } from "@turf/turf";
	import Countdown from "@/components/utils/Countdown.svelte";

	let data: PokestopData = $derived(
		(getMapObjects()[getCurrentSelectedMapId()] as PokestopData) ??
		(getCurrentSelectedData() as PokestopData)
	);
	useMetadata(() => ({ title: data ? (data.name ?? m.pogo_pokestop()) : undefined }));

	const snapPoints = ["330px", 1];
	let activeSnapPoint: number | string = $state(snapPoints[1]);

	let quest = $derived(data?.quests[0]);
	let [invasions, kecleons, contests] = $derived.by(() => {
		const invasions: Incident[] = [];
		const kecleons: Incident[] = [];
		const contests: Incident[] = [];

		for (const incident of data.incident) {
			if (incident.id && incident.expiration > currentTimestamp()) {
				if (isIncidentInvasion(incident)) {
					invasions.push(incident);
				} else if (isIncidentContest(incident)) {
					contests.push(incident);
				} else if (isIncidentKecleon(incident)) {
					kecleons.push(incident);
				}
			}
		}
		return [invasions, kecleons, contests];
	});

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
			<div class="flex gap-6 items-center px-4">
				<FortImage
					alt={data.name ?? m.pogo_pokestop()}
					fortUrl={data.url}
					fortIcon={getIconPokestop(data)}
					fortName={data.name}
					fortDescription={data.description}
				/>
				<h1 class="font-semibold text-xl">
					{data.name}
				</h1>

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

						{#if quest}
							<div
								class="bg-accent text-accent-foreground w-60 px-4 pt-2 pb-4 border border-border rounded-lg">
								<h2 class="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
									<QuestIcon class="fill-muted-foreground size-3.5" />
									Quest
								</h2>
								<div class="flex items-center gap-2">
									<div class="w-7 h-7 shrink-0">
										{#if quest.reward}
											<ImagePopup
												src={getIconReward(quest.reward.type, quest.reward.info)}
												alt={getRewardText(quest.reward)}
												class="w-7 h-7"
											/>
										{/if}
									</div>
									<h3 class="font-semibold">
										{getRewardText(quest.reward)}
									</h3>
								</div>

								<p class="mt-2 text-muted-foreground">
									{mQuest(quest.title, quest.target)}
								</p>
							</div>
						{/if}

						{#each data.incident as incident}
							{#if incident.id && incident.expiration > currentTimestamp() && shouldDisplayIncident(incident, data)}
								{#if isIncidentInvasion(incident)}
									<div
										class="bg-accent text-accent-foreground w-50 px-4 pt-2 pb-4 border border-border rounded-lg">
										<h2 class="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
											<InvasionIcon class="fill-muted-foreground size-3.5" />
											Team Rocket
										</h2>
										<div class="flex items-center gap-2">
											<div class="w-7 h-7 shrink-0">
												{#if quest.reward}
													<ImagePopup
														src={getIconInvasion(incident.character, incident.confirmed)}
														alt={mCharacter(incident.character)}
														class="w-7"
													/>
												{/if}
											</div>
											<h3 class="font-semibold">
												{mCharacter(incident.character)}
											</h3>
										</div>

										<p class="mt-2 text-muted-foreground">
											{mQuest(quest.title, quest.target)}
										</p>
									</div>
									<!--{:else if isIncidentKecleon(incident)}-->
									<!--	<PokestopSection titleParts={[m.kecleon()]}>-->
									<!--		<div class="flex gap-2 items-center">-->
									<!--			<div class="w-7 h-7 shrink-0">-->
									<!--				<ImagePopup-->
									<!--					src={getIconPokemon({ pokemon_id: KECLEON_ID })}-->
									<!--					alt={mPokemon({ pokemon_id: KECLEON_ID })}-->
									<!--					class="w-7"-->
									<!--				/>-->
									<!--			</div>-->
									<!--			<div>-->
									<!--				{m.lasts_until()}:-->
									<!--				<TimeWithCountdown expireTime={incident.expiration} showHours={false} />-->
									<!--			</div>-->
									<!--		</div>-->
									<!--	</PokestopSection>-->
									<!--{:else if isIncidentContest(incident)}-->
									<!--	<ContestDisplay {expanded} {incident} {data} />-->
								{/if}
							{/if}
						{/each}
					</div>
				</div>
			{/if}

			<div class="mt-5">
				<PopupButtons lat={data.lat} lon={data.lon} />
			</div>

			<div class="px-4 pt-3 mt-1 pb-6 space-y-6 overflow-y-auto">
				<h2 class="mb-2 flex items-center gap-1.5 font-semibold">
					<QuestIcon class="fill-card-foreground size-3.5" />
					{m.pogo_quest()}
				</h2>

				<div class="bg-accent text-accent-foreground px-4 py-4 border border-border rounded-lg">
					{#if quest}
						<!--					<h2 class="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">-->
						<!--						<QuestIcon class="fill-muted-foreground size-3.5" />-->
						<!--						Quest-->
						<!--					</h2>-->
						<div class="flex items-center gap-2 mb-3">
							<div class="w-7 h-7 shrink-0">
								{#if quest.reward}
									<ImagePopup
										src={getIconReward(quest.reward.type, quest.reward.info)}
										alt={getRewardText(quest.reward)}
										class="w-7 h-7"
									/>
								{/if}
							</div>
							<h3 class="font-semibold">
								{getRewardText(quest.reward)}
							</h3>
						</div>

						<IconValue Icon={Target}>
							{m.task()}: <b>{mQuest(quest.title, quest.target)}</b>
						</IconValue>


						<IconValue Icon={Clock}>
							{m.popup_found()} <b>{timestampToLocalTime(quest.timestamp, true)}</b>
						</IconValue>

						<Button class="mt-3" variant="secondary">
							<Globe class="size-3.5" />
							Find more {getRewardText(quest.reward)} Quests
						</Button>
					{/if}
				</div>

				<h2 class="mb-2 flex items-center gap-1.5 font-semibold">
					<InvasionIcon class="fill-card-foreground size-3.5" />
					{m.pogo_invasion()}
				</h2>

				<div class="space-y-4">
					{#each invasions as invasion}
						{@const hasLineup = hasInvasionLineup(invasion.character)}
						{@const lineup = getInvasionLineup(invasion.character)}
						{@const catchables = getInvasionCatchable(invasion.character) ?? []}
						<div class="bg-accent text-accent-foreground px-4 py-4 border border-border rounded-lg">
							<!--					<h2 class="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">-->
							<!--						<QuestIcon class="fill-muted-foreground size-3.5" />-->
							<!--						Quest-->
							<!--					</h2>-->
							<div class="flex items-center gap-2 mb-3">
								<div class="w-7 h-7 shrink-0">
									<ImagePopup
										src={getIconInvasion(invasion.character, invasion.confirmed)}
										alt={mCharacter(invasion.character)}
										class="w-7"
									/>
								</div>
								<h3 class="font-semibold">
									{mCharacter(invasion.character)}
								</h3>
							</div>

							<IconValue Icon={Clock}>
								{m.lasts_until()}
								<b>
									<TimeWithCountdown
										expireTime={invasion.expiration}
										showHours={invasion.display_type !== 1}
									/>
								</b>
							</IconValue>

							<div class="-mx-4">
								<!--{#if num}-->
								<!--	<div class="border border-border rounded-sm flex justify-center items-center h-9 px-1.5">-->
								<!--		<p class="text-sm text-muted-foreground">-->
								<!--			#{num}-->
								<!--		</p>-->
								<!--	</div>-->
								<!--{/if}-->

								{#if lineup}
									<IconValue class="mb-1.5 mt-2 px-4" Icon={Sword}>
										Possible Lineup:
									</IconValue>
									<div class="w-full flex overflow-x-auto *:shrink-0 gap-3 px-4">
										<div class="rounded-sm px-2 py-1 bg-indigo-950/50">
											<div class="flex items-center">
												<p class="text-muted-foreground font-semibold text-sm pr-1">
													#1
												</p>
												{#each lineup.first as slotMon (`${slotMon.pokemon_id}-${slotMon.form}`)}
													{@const pokemon = getInvasionPokemon(slotMon)}
													<div class="p-1 size-10">
														<ImagePopup
															src={getIconPokemon(pokemon)}
															alt={mPokemon(pokemon)}
														/>
													</div>
												{/each}
											</div>
											<p class="w-full text-center px-2 text-muted-foreground text-sm font-semibold mt-1">
												Catchable
											</p>
										</div>

										<div class="flex rounded-sm px-2 py-1 items-center bg-border/50">
											<p class="text-muted-foreground font-semibold text-sm pr-1">
												#2
											</p>
											{#each lineup.second as slotMon (`${slotMon.pokemon_id}-${slotMon.form}`)}
												{@const pokemon = getInvasionPokemon(slotMon)}
												<div class="p-1 size-10">
													<ImagePopup
														src={getIconPokemon(pokemon)}
														alt={mPokemon(pokemon)}
													/>
												</div>
											{/each}
										</div>

										<div class="flex rounded-sm px-2 py-1 items-center bg-border/50">
											<p class="text-muted-foreground font-semibold text-sm pr-1">
												#3
											</p>
											{#each lineup.third as slotMon (`${slotMon.pokemon_id}-${slotMon.form}`)}
												{@const pokemon = getInvasionPokemon(slotMon)}
												<div class="p-1 size-10">
													<ImagePopup
														src={getIconPokemon(pokemon)}
														alt={mPokemon(pokemon)}
													/>
												</div>
											{/each}
										</div>
										<!--{#each catchables as slotMon (`${slotMon.pokemon_id}-${slotMon.form}`)}-->
										<!--	{@const pokemon = getInvasionPokemon(slotMon)}-->
										<!--	<div class="p-1 size-14">-->
										<!--		<ImagePopup-->
										<!--			src={getIconPokemon(pokemon)}-->
										<!--			alt={mPokemon(pokemon)}-->
										<!--		/>-->
										<!--	</div>-->
										<!--{/each}-->
									</div>
								{/if}

								<!--								<div-->
								<!--									class="flex flex-wrap border border-border rounded-sm w-fit h-9"-->
								<!--								>-->
								<!--									{#each catchables as slotMon (`${slotMon.pokemon_id}-${slotMon.form}`)}-->
								<!--										{@const pokemon = getInvasionPokemon(slotMon)}-->
								<!--										<div class="p-1 size-8">-->
								<!--											<ImagePopup src={getIconPokemon(pokemon)} alt={mPokemon(pokemon)} />-->
								<!--										</div>-->
								<!--									{/each}-->
								<!--								</div>-->
							</div>

							<Button class="mt-3" variant="secondary">
								<Globe class="size-3.5" />
								Find more {mCharacter(invasion.character)}s
							</Button>
						</div>
					{/each}

				</div>

				<h2 class="mb-2 flex items-center gap-1.5 font-semibold">
					<Rat class="size-3.5" />
					{m.kecleon()}
				</h2>

				<div class="bg-accent text-accent-foreground px-4 py-4 border border-border rounded-lg">
					<!--					<h2 class="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">-->
					<!--						<QuestIcon class="fill-muted-foreground size-3.5" />-->
					<!--						Quest-->
					<!--					</h2>-->
					<div class="flex items-center gap-2 mb-3">
						<div class="w-7 h-7 shrink-0">
							<ImagePopup
								src={getIconPokemon({ pokemon_id: KECLEON_ID })}
								alt={mPokemon({ pokemon_id: KECLEON_ID })}
								class="w-7"
							/>
						</div>
						<h3 class="font-semibold">
							A Kecleon is hiding here
						</h3>
					</div>

					<IconValue Icon={Clock}>
						{m.lasts_until()}
						<b>
							<TimeWithCountdown
								expireTime={kecleons[0]?.expiration ?? 0}
								showHours={false}
							/>
						</b>
					</IconValue>
					<Button class="mt-3" variant="secondary">
						<Globe class="size-3.5" />
						Find more Kecleon
					</Button>
				</div>

				<h2 class="mb-2 flex items-center gap-1.5 font-semibold">
					<Medal class="size-3.5" />
					Showcase
				</h2>

				<div class="bg-accent text-accent-foreground px-4 py-4 border border-border rounded-lg">
					{#if !data.showcase_expiry}
						This Pokestop never had a showcase
					{:else}
						<IconValue Icon={Clock}>
							Last showcase ended {timestampToLocalTime(data.showcase_expiry, true)}
						</IconValue>
					{/if}
				</div>

				<h2 class="mb-2 flex items-center gap-1.5 font-semibold">
					<Signpost class="size-3.5" />
					Routes
				</h2>

				<div class="bg-accent text-accent-foreground px-4 py-4 border border-border rounded-lg">
					No routes starting or ending at this Pokestop
				</div>

				<h2 class="mb-2 flex items-center gap-1.5 font-semibold">
					<CircleDot class="size-3.5" />
					Access this Pokestop
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
						<ImagePopup
							src={getIconPokestop({})}
							alt={m.pogo_pokestop()}
						/>
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
					About this Pokestop
				</h2>

				<div class="mb-4 bg-accent text-accent-foreground px-4 py-4 border border-border rounded-lg">
					<p class="font-semibold mb-2">
						{data.name}
					</p>

					{#if !data.description}
						<p class="text-muted-foreground">
							No description
						</p>
					{:else}
						<p class="text-muted-foreground">
							{data.description}
						</p>
					{/if}

					<div class="mt-2 relative rounded-md overflow-hidden h-28 w-full">
						<button class="size-full absolute z-10 bg-black/50 backdrop-blur-[1px] flex justify-center items-center">
<!--							<span class="bg-accent text-accent-foreground border border-border px-4 py-1 rounded-md text-sm font-medium shadow-sm">-->
<!--								Reveal full image-->
<!--							</span>-->
							<Button class="bg-accent/40! backdrop-blur-sm" variant="outline" size="sm">
								Show full image
							</Button>
						</button>
						<img
							class="absolute size-full object-cover"
							alt="Cover Photo of {data.name}"
							src={data.url}
						/>
					</div>

					<Button class="mt-4" variant="secondary">
						<MapPin class="size-3.5" />
						Go to Wayfarer Map
					</Button>
				</div>

				<div class="space-y-3 bg-accent text-accent-foreground px-4 py-4 border border-border rounded-lg">
					<!--					<h2 class="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">-->
					<!--						<QuestIcon class="fill-muted-foreground size-3.5" />-->
					<!--						Quest-->
					<!--					</h2>-->
					<div class="flex justify-between">
						<div class="flex gap-1.5 text-muted-foreground items-center">
							<Clock class="size-3.5" />
							{m.last_seen()}
						</div>
						<Countdown expireTime={data.updated} />
					</div>
					<div class="flex justify-between">
						<div class="flex gap-1.5 text-muted-foreground items-center">
							<ClockArrowUp class="size-3.5" />
							{m.last_updated()}
						</div>
						<Countdown expireTime={data.last_modified_timestamp} />
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