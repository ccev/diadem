<script lang="ts">
	import { getClickedFort, setClickedFort } from "@/lib/features/wayfarerMap.svelte";
	import FortImage from "@/components/ui/popups/common/FortImage.svelte";
	import UpdatedTimes from "@/components/ui/popups/common/UpdatedTimes.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import { getIconGym, getIconPokestop } from "@/lib/services/uicons.svelte";
	import { BadgeEuro, MapPin } from "lucide-svelte";
	import * as m from "@/lib/paraglide/messages";
	import BasePopup from "@/components/ui/popups/BasePopup.svelte";

	let data = $derived(getClickedFort());
</script>

{#if data}
	<BasePopup
		class="pb-2"
		isExpanded={() => true}
		buttons={undefined}
		canShare={false}
		onclose={() => setClickedFort(undefined)}
	>
		{#snippet image()}
			<FortImage
				alt={data.name ?? m.pogo_pokestop()}
				fortUrl={data.url}
				fortIcon={data.type === "g" ? getIconGym({ team_id: 0 }) : getIconPokestop({})}
				fortName={data.name}
				fortDescription={data.description}
			/>
		{/snippet}

		{#snippet title()}
			<div class="text-lg font-semibold tracking-tight">
			<span>
				{#if data.name}
					{data.name}
				{:else}
					{#if data.type === "g"}
						{m.unknown_gym()}
					{:else if data.type === "p"}
						{m.unknown_pokestop()}
					{:else}
						{m.unknown_poi()}
					{/if}
				{/if}
			</span>
			</div>
		{/snippet}

		{#snippet content()}
			{#if data.description}
				<div class="flex mb-3">
					<div
						class="w-0.5 my-1 bg-border shrink-0 ml-0.5 mr-2.5"
					></div>
					<p>
						{data.description}
					</p>
				</div>

			{/if}

			<IconValue Icon={MapPin}>
				{#if data.type === "g"}
					{m.is_a_gym()}
				{:else if data.type === "p"}
					{m.is_a_pokestop()}
				{:else}
					{m.not_in_game()}
				{/if}
			</IconValue>

			{#if data.partner_id || data.sponsor_id}
				<IconValue Icon={BadgeEuro}>
					{m.wayfarer_sponsored()}
				</IconValue>
			{/if}

			<UpdatedTimes updated={data.updated} firstSeen={data.first_seen_timestamp} />
		{/snippet}
	</BasePopup>
{/if}
