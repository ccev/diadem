<script lang="ts">
	import { getClickedFort, setClickedFort } from "@/lib/features/wayfarerMap.svelte";
	import { getIconGym, getIconPokestop } from "@/lib/services/uicons.svelte";
	import { BadgeEuro, Clock, ClockAlert, MapPin, Search } from "@lucide/svelte";

	import WayfarerBasePopup from "@/components/ui/popups/WayfarerBasePopup.svelte";
	import { isFortOutdated } from "$lib/utils/gymUtils";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import Countdown from "@/components/utils/Countdown.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import FortImage from "@/components/ui/popups/common/FortImage.svelte";

	let data = $derived(getClickedFort());
</script>

{#if data}
	<WayfarerBasePopup
		class="pb-2"
		isExpanded={() => true}
		buttons={undefined}
		canShare={false}
		onclose={() => setClickedFort(undefined)}
	>
		{#snippet image()}
			<FortImage
				alt={data.name ?? "Pokéstop"}
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
					{:else if data.type === "g"}
						Unknown Gym
					{:else if data.type === "p"}
						Unknown Pokéstop
					{:else}
						Unknown POI
					{/if}
				</span>
			</div>
		{/snippet}

		{#snippet content()}
			{#if data.description}
				<div class="flex mb-3">
					<div class="w-0.5 my-1 bg-border shrink-0 ml-0.5 mr-2.5"></div>
					<p>
						{data.description}
					</p>
				</div>
			{/if}

			<IconValue Icon={MapPin}>
				{#if data.type === "g"}
					Is a Gym
				{:else if data.type === "p"}
					Is a Pokéstop
				{:else}
					Not available in-game
				{/if}
			</IconValue>

			{#if data.partner_id || data.sponsor_id}
				<IconValue Icon={BadgeEuro}>Sponsored</IconValue>
			{/if}

			{#if data.updated}
				<IconValue Icon={isFortOutdated(data.updated) ? ClockAlert : Clock}>
					Last seen: <b><Countdown expireTime={data.updated} /></b>
					{#if isFortOutdated(data.updated)}
						(outdated)
					{/if}
				</IconValue>
			{/if}

			{#if data.first_seen_timestamp}
				<IconValue Icon={Search}>
					First seen:
					<b>{timestampToLocalTime(data.first_seen_timestamp, { showDate: true })}</b>
				</IconValue>
			{/if}
		{/snippet}
	</WayfarerBasePopup>
{/if}
