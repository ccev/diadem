<script lang="ts">
	import {
		clearDimmedCandidates,
		getClickedCandidate,
		getDimmedCandidateCount,
		isCandidateDimmed,
		setClickedCandidate,
		toggleCandidateDimmed
	} from "@/lib/features/wayfarerMap.svelte";
	import { getWayfarerCandidateLabel } from "@/lib/services/wayfarerTags";
	import { getCandidateIcon } from "@/lib/services/wayfarerCandidateIcons";
	import BasePopup from "@/components/ui/popups/BasePopup.svelte";
	import PopupButton from "@/components/ui/popups/common/PopupButton.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import {
		Clock,
		ExternalLink,
		Eye,
		EyeClosed,
		Globe,
		Info,
		Navigation,
		Quote,
		Store,
		Tag,
		Type
	} from "lucide-svelte";
	import * as m from "@/lib/paraglide/messages";
	import { getMapsUrl } from "@/lib/utils/mapUrl";
	import { Coords } from "@/lib/utils/coordinates";
	import type maplibre from "maplibre-gl";

	let { map }: { map: maplibre.Map | undefined } = $props();

	let data = $derived(getClickedCandidate());

	let osmUrl = $derived(
		data ? `https://www.openstreetmap.org/${data.osmType}/${data.id}` : undefined
	);

	let label = $derived(data ? getWayfarerCandidateLabel(data.tags) : "");
	let CategoryIcon = $derived(data ? getCandidateIcon(data.tags) : undefined);
	let dimmed = $derived(data ? isCandidateDimmed(data) : false);
	let dimmedCount = $derived(getDimmedCandidateCount());

	function normaliseUrl(url: string): string {
		return url.startsWith("http") ? url : "https://" + url;
	}

	function truncate(value: string, max = 50): string {
		return value.length > max ? value.slice(0, max) + "…" : value;
	}
</script>

{#if data}
	<BasePopup
		class="pb-2"
		isExpanded={() => true}
		canShare={false}
		onclose={() => setClickedCandidate(undefined)}
		lat={data.lat}
		lon={data.lon}
		buttons={candidateButtons}
	>
		{#snippet image()}
			<div
				class="size-9 rounded-full border-2 shrink-0 flex items-center justify-center bg-white"
				style:border-color="#06b6d4"
			>
				{#if CategoryIcon}
					<CategoryIcon class="size-5" color="#06b6d4" />
				{/if}
			</div>
		{/snippet}

		{#snippet title()}
			<div class="text-lg font-semibold tracking-tight">
				{m.wayfarer_candidate_title()}
			</div>
		{/snippet}

		{#snippet content()}
			<IconValue Icon={Tag}>
				<span class="text-muted-foreground">{m.wayfarer_candidate_prop_type()}:</span>
				{label}
			</IconValue>

			{#if data.tags.name}
				<IconValue Icon={Type}>
					<span class="text-muted-foreground">{m.wayfarer_candidate_prop_name()}:</span>
					{data.tags.name}
				</IconValue>
			{/if}

			{#if data.tags.description}
				<IconValue Icon={Info}>
					<span class="text-muted-foreground">{m.wayfarer_candidate_prop_description()}:</span>
					{data.tags.description}
				</IconValue>
			{/if}

			{#if data.tags.operator || data.tags.brand}
				<IconValue Icon={Store}>
					<span class="text-muted-foreground">{m.wayfarer_candidate_prop_operator()}:</span>
					{data.tags.operator ?? data.tags.brand}
				</IconValue>
			{/if}

			{#if data.tags.opening_hours}
				<IconValue Icon={Clock}>
					<span class="text-muted-foreground">{m.wayfarer_candidate_prop_opening_hours()}:</span>
					{data.tags.opening_hours}
				</IconValue>
			{/if}

			{#if data.tags.website || data.tags.url || data.tags["contact:website"]}
				{@const link = data.tags.website ?? data.tags.url ?? data.tags["contact:website"]}
				<IconValue Icon={Globe}>
					<span class="text-muted-foreground">{m.wayfarer_candidate_prop_website()}:</span>
					<a
						href={normaliseUrl(link)}
						target="_blank"
						rel="noopener noreferrer"
						class="underline hover:no-underline"
					>
						{truncate(link)}
					</a>
				</IconValue>
			{/if}

			{#if data.tags.inscription}
				<IconValue Icon={Quote}>
					<span class="text-muted-foreground">{m.wayfarer_candidate_prop_inscription()}:</span>
					<span class="italic">{data.tags.inscription}</span>
				</IconValue>
			{/if}
		{/snippet}
	</BasePopup>
{/if}

{#snippet candidateButtons(lat: number, lon: number)}
	<div class="flex px-4 gap-1.5 w-full overflow-x-auto pb-4">
		{#if osmUrl}
			<PopupButton
				variant="default"
				Icon={ExternalLink}
				label={m.wayfarer_candidate_view_on_osm()}
				tag="a"
				href={osmUrl}
				target="_blank"
				rel="noopener noreferrer"
			/>
		{/if}
		<PopupButton
			variant="secondary"
			Icon={Navigation}
			label={m.popup_navigate()}
			tag="a"
			href={getMapsUrl(new Coords(lat, lon), data?.tags.name)}
			target="_blank"
		/>
		<PopupButton
			Icon={EyeClosed}
			label={m.popup_action_dim()}
			IconActive={Eye}
			labelActive={m.popup_action_undim()}
			active={dimmed}
			onclick={() => data && toggleCandidateDimmed(data, map)}
			actions={dimmedCount > 0
				? [
						{
							label: m.popup_action_undim_all_candidate(),
							Icon: Eye,
							onclick: () => clearDimmedCandidates(map)
						}
					]
				: []}
		/>
	</div>
{/snippet}
