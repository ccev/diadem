<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups2/common/PopupBaseStatic.svelte";
	import * as m from "$lib/paraglide/messages";
	import { type MapData, MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import type { SpawnpointData } from "$lib/types/mapObjectData/spawnpoint";
	import { SPAWNPOINT_OUTDATED_SECONDS } from "$lib/constants";
	import { currentTimestamp } from "$lib/utils/currentTimestamp";
	import { getMmSsFromSeconds } from "$lib/utils/time";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import Button from "@/components/ui/input/Button.svelte";
	import BasicMainCard from "@/components/ui/popups2/common/BasicMainCard.svelte";
	import MainAccessMap from "@/components/ui/popups2/common/MainAccessMap.svelte";
	import OverviewCard from "@/components/ui/popups2/common/OverviewCard.svelte";
	import StatsMainCard from "@/components/ui/popups2/common/StatsMainCard.svelte";
	import StatsMainCardEntry from "@/components/ui/popups2/common/StatsMainCardEntry.svelte";
	import TitledMainSection from "@/components/ui/popups2/common/TitledMainSection.svelte";
	import UpdatedTimes from "@/components/ui/popups2/common/UpdatedTimes.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import { CircleAlert, CircleDot, Expand, FingerprintPattern, Info, Shrink, Timer } from "@lucide/svelte";


	export { image, overview, main };

	export function getPopupPropsSpawnpoint(data: MapData) {
		data = data as SpawnpointData;
		return {
			type: m.pogo_spawnpoint(),
			title: m.pogo_spawnpoint(),
			image,
			overview,
			main
		} as MapObjectPopupProps;
	}

	let mapExpandedRadius: boolean = $state(false);

	function isOutdated(data: SpawnpointData) {
		return data.last_seen < currentTimestamp() - SPAWNPOINT_OUTDATED_SECONDS;
	}
</script>

{#snippet image(d: MapData)}
	{@const data = d as SpawnpointData}
	{@const outdated = isOutdated(data)}
	<div
		class="size-14 rounded-full border-4 shrink-0"
		class:border-cyan-400={!outdated}
		class:bg-cyan-200={!outdated}
		class:dark:border-sky-500={!outdated}
		class:dark:bg-sky-600={!outdated}
		class:border-rose-400={outdated}
		class:bg-rose-300={outdated}
		class:dark:border-rose-500={outdated}
		class:dark:bg-rose-700={outdated}
	></div>
{/snippet}

{#snippet overview(d: MapData)}
	{@const data = d as SpawnpointData}
	<OverviewCard Icon={Timer} title={m.disappear_time()}>
		{#snippet value()}
			{#if data.despawn_sec != null}
				{getMmSsFromSeconds(data.despawn_sec)}
			{:else}
				{m.unknown()}
			{/if}
		{/snippet}
	</OverviewCard>
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as SpawnpointData}
	{@const outdated = isOutdated(data)}
	{@const markerFillColor = outdated ? "rgba(251, 99, 124, 0.6)" : "rgba(116, 223, 253, 0.6)"}
	{@const markerStrokeColor = outdated ? "rgba(179, 38, 77, 0.8)" : "rgba(57, 140, 168, 0.8)"}

	{#if outdated}
		<BasicMainCard class="font-medium">
			<IconValue Icon={CircleAlert}>
				{m.spawnpoint_outdated_notice({
					time: timestampToLocalTime(data.last_seen, {
						showDate: true,
						showSeconds: false,
						showTime: false,
						longMonth: true
					})
				})}
			</IconValue>
		</BasicMainCard>
	{/if}

	<TitledMainSection Icon={Info} title={m.about_this_spawnpoint()}>
		<StatsMainCard>
			<StatsMainCardEntry
				Icon={Timer}
				name={m.disappear_time()}
				value={data.despawn_sec != null
					? getMmSsFromSeconds(data.despawn_sec)
					: m.unknown()}
			/>
			<StatsMainCardEntry
				Icon={FingerprintPattern}
				name={m.s2_cell_id()}
				value={data.id}
			/>
			<UpdatedTimes updated={data.last_seen} firstSeen={data.first_seen} />
		</StatsMainCard>
	</TitledMainSection>

	<TitledMainSection Icon={CircleDot} title={m.access_this_spawnpoint()}>
		<div class="relative">
			<MainAccessMap
				lat={data.lat}
				lon={data.lon}
				type={MapObjectType.SPAWNPOINT}
				radius={mapExpandedRadius ? 80 : 40}
				zoom={mapExpandedRadius ? 15.5 : 16.5}
				marker="circle"
				markerRadius={5}
				{markerFillColor}
				{markerStrokeColor}
			/>
			<Button
				variant="outline"
				size="sm"
				class="mt-2 absolute top-3 right-3 bg-accent! hover:bg-background! active:bg-background!"
				onclick={() => (mapExpandedRadius = !mapExpandedRadius)}
			>
				{#if mapExpandedRadius}
					<Shrink class="size-3.5" />
					{m.normal()}
				{:else}
					<Expand class="size-3.5" />
					{m.popup_action_spacial_rend()}
				{/if}
			</Button>
		</div>
	</TitledMainSection>
{/snippet}
