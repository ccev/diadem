<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import * as m from "$lib/paraglide/messages";
	import { mPokemon } from "$lib/services/ingameLocale";
	import type { MapData } from "$lib/mapObjects/mapObjectTypes";
	import { MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import OverviewCard from "@/components/ui/popups/common/OverviewCard.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import StatsMainCard from "@/components/ui/popups/common/StatsMainCard.svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import UpdatedTimes from "@/components/ui/popups/common/UpdatedTimes.svelte";
	import { getIconPokemon, getIconPokestop, getIconTappable } from "$lib/services/uicons.svelte";
	import { formatNumber, formatPercentage, formatDecimal } from "$lib/utils/numberFormat";
	import { CircleDot, CircleSlash2, Clock, Info, MapPinned, RotateCcw, Trees, VectorSquare } from "@lucide/svelte";
	import type { NestData } from "$lib/types/mapObjectData/nest";
	import AccessPolygonMap from "@/components/ui/popups/common/AccessPolygonMap.svelte";
	import type { TappableData } from "$lib/types/mapObjectData/tappable.d.ts";
	import { getTappableName } from "$lib/utils/tappableUtils";
	import { setActiveSearchPokemon } from "$lib/features/activeSearch.svelte";
	import QuickSearchButton from "@/components/ui/popups/common/QuickSearchButton.svelte";
	import { hasTimer } from "$lib/utils/pokemonUtils";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import Countdown from "@/components/utils/Countdown.svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import { resize } from "$lib/services/assets";
	import MainAccessMap from "@/components/ui/popups/common/MainAccessMap.svelte";

	export { image, main };

	export function getPopupPropsTappable(data: MapData) {
		data = data as TappableData;
		return {
			type: m.pogo_tappable(),
			title: getTappableName(data),
			image,
			main
		} as MapObjectPopupProps;
	}
</script>
<script>
	import BigCountdown from "@/components/ui/popups/common/BigCountdown.svelte";
</script>

{#snippet image(d: MapData)}
	{@const data = d as TappableData}
	<div class="size-14 shrink-0">
		<ImagePopup alt={getTappableName(data)} src={getIconTappable(data)} class="w-12 h-12" />
	</div>
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as TappableData}

	<BigCountdown
		expire={data?.expire_timestamp ?? 0}
		fallbackExpire={data.updated}
		useFallback={!hasTimer(data)}
		fallbackTitle={m.last_seen()}
		fallbackExplanation={m.unknown_spawnpoint_notice()}
	/>

	<TitledMainSection Icon={CircleDot} title={m.access_this_tappable()}>
		<MainAccessMap
			lat={data.lat}
			lon={data.lon}
			type={MapObjectType.TAPPABLE}
			uiconType="tappable"
			radius={40}
			zoom={16.5}
			icon={resize(getIconTappable(data), { width: 64 })}
		/>
	</TitledMainSection>
{/snippet}
