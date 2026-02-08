<script lang="ts">
	import { getConfig } from "@/lib/services/config/config";
	import * as m from "@/lib/paraglide/messages";
	import Card from "@/components/ui/Card.svelte";
	import SliderSteps from "@/components/ui/input/slider/SliderSteps.svelte";
	import MenuTitle from "@/components/menus/MenuTitle.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import { onDestroy, onMount } from "svelte";
	import {
		getCoords,
		getCurrentScoutData,
		getScoutQueue,
		resetCurrentScoutData,
		type ScoutGeoProperties,
		setCurrentScoutCoords,
		setScoutGeojson,
		startScout
	} from "@/lib/features/scout.svelte.js";
	import { closeMenu, openMenu } from "@/lib/ui/menus.svelte.js";
	import { circle as makeCrircle } from "@turf/turf";
	import { RADIUS_POKEMON, RADIUS_SCOUT_GMO } from "@/lib/constants";
	import type { Feature, Polygon } from "geojson";
	import { watch } from "runed";
	import { openToast } from "@/lib/ui/toasts.svelte.js";
	import Metadata from "@/components/utils/Metadata.svelte";

	let size: 0 | 1 | 2 = $state(0);
	let queuePosition: number | undefined = $state(undefined);

	let interval: NodeJS.Timeout | undefined = undefined;

	onMount(() => {
		updateQueuePosition().then();
		interval = setInterval(updateQueuePosition, 750);
	});

	onDestroy(() => {
		resetCurrentScoutData();
		if (interval) clearInterval(interval);
	});

	watch(
		() => getCurrentScoutData().center,
		() => updatePoints(size)
	);

	async function updateQueuePosition() {
		queuePosition = await getScoutQueue();
	}

	async function scoutButton() {
		const success = await startScout();
		closeMenu();

		if (success) {
			openToast(m.scout_toast_success());
		} else {
			openToast(m.scout_toast_error());
		}
	}

	function updatePoints(newSize: 0 | 1 | 2) {
		console.debug("update points");
		size = newSize;

		setCurrentScoutCoords(getCoords(getCurrentScoutData().center, size));

		const smallPoints: Feature<Polygon, ScoutGeoProperties>[] = [];
		const bigPoints: Feature<Polygon, ScoutGeoProperties>[] = [];
		getCurrentScoutData().coords.forEach(c => {
			const smallCircle = makeCrircle([c.lon, c.lat], RADIUS_POKEMON / 1000) as Feature<Polygon, ScoutGeoProperties>;
			smallCircle.properties.fillColor = "#DAB2FFFF";
			smallCircle.properties.strokeColor = "#DAB2FFFF";
			smallPoints.push(smallCircle);

			if (size === 1 && bigPoints.length > 0) return;  // only draw the middle circle in M

			const bigCircle = makeCrircle([c.lon, c.lat], RADIUS_SCOUT_GMO / 1000) as Feature<Polygon, ScoutGeoProperties>;
			bigCircle.properties.fillColor = "#DFF2FEFF";
			bigCircle.properties.strokeColor = "#DFF2FEFF";
			bigPoints.push(bigCircle);
		});

		setScoutGeojson(smallPoints, bigPoints);
	}
</script>

<svelte:head>
	<Metadata title={m.nav_scout()} />
</svelte:head>

<Card class="py-4 px-2">
	<div class="flex flex-col gap-2">
		<MenuTitle title={m.scout_area_size()} />
		<div data-vaul-no-drag>
			<SliderSteps
				value={size}
				onchange={updatePoints}
				steps={[0, 1, 2]}
				labels={{
					0: "S",
					1: "M",
					2: "L"
				}}
			/>
		</div>
	</div>

	<div class="w-full text-center my-2 text-sm">
		<p>
			{m.scout_queue_position()}: {queuePosition ?? ""}
		</p>
	</div>

	<Button variant="default" size="lg" class="w-full" onclick={scoutButton}>
		{m.scout_start()}
	</Button>

</Card>
