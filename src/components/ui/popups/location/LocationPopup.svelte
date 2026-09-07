<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import type { MapData } from "$lib/mapObjects/mapObjectTypes";
	import { MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import type { LocationData } from "$lib/types/mapObjectData/location";
	import * as m from "$lib/paraglide/messages";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import { getIconGym, getIconPokestop, getIconStation } from "$lib/services/uicons.svelte";
	import { copyToClipboard } from "$lib/utils/device";
	import { formatDistance } from "$lib/utils/numberFormat";
	import { CircleDot, Clipboard, House, MapPin } from "@lucide/svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import { isSupportedFeature } from "$lib/services/supportedFeatures";
	import FortImage from "@/components/ui/popups/common/FortImage.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import { formattedCoordinates } from "$lib/features/location.svelte";

	export { image, overview, main };

	export function getPopupPropsLocation(d: MapData): MapObjectPopupProps {
		const data = d as LocationData;
		return {
			type: m.location(),
			title: data.address ?? formattedCoordinates(data),
			image,
			overview,
			main
		};
	}
</script>

{#snippet image()}
	<div
		class="flex size-13 shrink-0 items-center justify-center rounded-full bg-accent text-muted-foreground -mr-2"
	>
		<MapPin class="size-5.5" />
	</div>
{/snippet}

{#snippet overview(d: MapData)}
	{@const data = d as LocationData}
		{#each data.nearby as nearby (nearby.mapId)}
		<div class="flex min-w-48 max-w-64 items-center gap-5 rounded-lg border bg-accent px-4 py-3">
			{#if nearby.type === MapObjectType.GYM || nearby.type === MapObjectType.POKESTOP}
				<FortImage
					class="size-14! py-0!"
					alt={nearby.name ?? (nearby.type === MapObjectType.GYM ? m.pogo_gym() : m.pogo_pokestop())}
					fortUrl={nearby.url}
					fortIcon={nearby.type === MapObjectType.GYM ? getIconGym(nearby) : getIconPokestop(nearby)}
					fortName={nearby.name}
					fortDescription={nearby.description}
				/>
			{:else}
				<ImagePopup
					class="size-10 shrink-0"
					src={getIconStation(nearby)}
					alt={m.pogo_station()}
				/>
			{/if}
			<div class="min-w-0">
				<p class="text-muted-foreground">
					{#if nearby.type === MapObjectType.POKESTOP}
						{m.pogo_pokestop()}
					{:else if nearby.type === MapObjectType.GYM}
						{m.pogo_gym()}
					{:else if nearby.type === MapObjectType.STATION}
						{m.pogo_station()}
					{/if}
					· {formatDistance(Math.round(nearby.distance))}
				</p>
				<p class="font-semibold text-xl line-clamp-2">
					{#if nearby.name}
						{nearby.name}
					{:else}
						{#if nearby.type === MapObjectType.POKESTOP}
							{m.unknown_pokestop()}
						{:else if nearby.type === MapObjectType.GYM}
							{m.unknown_gym()}
						{:else if nearby.type === MapObjectType.STATION}
							{m.pogo_station()}
						{/if}
					{/if}
				</p>

			</div>
		</div>
	{/each}
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as LocationData}

	<div class="space-y-2">
		{#if isSupportedFeature("geocoding")}
			<BasicMainCard class="p-0!">
				<button
					class="flex items-center gap-4 text-left size-full p-4!"
					disabled={data.isAddressLoading || !data.address}
					onclick={() => data.address && copyToClipboard(data.address)}
				>
					<House class="size-4 shrink-0 text-muted-foreground" />
					<div class="w-full">
						{#if data.isAddressLoading}
							<div class="mt-1 h-5 w-full animate-pulse rounded bg-accent-highlight"></div>
						{:else}
							<p class="font-medium">{data.address ?? m.address_unavailable()}</p>
						{/if}
					</div>
					{#if data.address}
						<Clipboard class="size-4 shrink-0 text-muted-foreground ml-auto" />
					{/if}

				</button>
			</BasicMainCard>
		{/if}

		<BasicMainCard class="p-0!">
			<button
				class="flex items-center gap-4 text-left size-full p-4!"
				onclick={() => copyToClipboard(formattedCoordinates(data))}
			>
				<MapPin class="size-4 shrink-0 text-muted-foreground" />
				<div class="font-medium">{formattedCoordinates(data)}</div>
				<Clipboard class="size-4 shrink-0 text-muted-foreground ml-auto" />
			</button>
		</BasicMainCard>
	</div>

	<TitledMainSection Icon={CircleDot} title="In Range">
		<div class="grid! grid-cols-2 gap-3">
			{#each [
				[m.pogo_spawnpoint(), m.spawnpoints(), data.spawnpoints],
				[m.pogo_gym(), m.pogo_gyms(), data.nearby.filter(n => n.type === MapObjectType.GYM).length],
				[m.pogo_pokestop(), m.pogo_pokestops(), data.nearby.filter(n => n.type === MapObjectType.POKESTOP).length],
				[m.pogo_station(), m.pogo_stations(), data.nearby.filter(n => n.type === MapObjectType.STATION).length],
			] as [single, plural, value]}
				<BasicMainCard>
					<p class="font-semibold text-2xl">
						{value}
					</p>
					<p class=" text-lg text-muted-foreground">
						{#if value === 1}
							{single}
						{:else}
							{plural}
						{/if}
					</p>
				</BasicMainCard>
			{/each}
		</div>
	</TitledMainSection>
{/snippet}
