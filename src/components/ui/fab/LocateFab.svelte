<script lang="ts">
	import BaseFab from '@/components/ui/fab/BaseFab.svelte';
	import { Locate, LocateOff } from 'lucide-svelte';
	import maplibre from 'maplibre-gl';
	import { openToast } from '@/components/ui/toast/toastUtils.svelte';
	import { tick } from 'svelte';

	let {
		map
	}: {
		map: maplibre.Map | undefined
	} = $props()

	const errorReasonSupport = "Your browser doesn't have location support"
	const errorReasonPerms = "Location permissions denied"
	const errorReasonUnknown = "An error occured while fetching your location"

	let geolocationEnabled: boolean = $state(false)
	let isFetchingLocation: boolean = $state(false)
	const geolocate = new  maplibre.GeolocateControl({ trackUserLocation: false, showAccuracyCircle: false })

	async function getGeolocationPermissionsState() {
		const permissions = await window.navigator.permissions.query({name: 'geolocation'});
		return permissions.state
	}

	async function updateGeolocationEnabled(showResult: boolean = false) {
		let errorReason = ""
		let geolocationOk: boolean = false

		if (!window.navigator.permissions) {
			geolocationOk = !!window.navigator.geolocation;
			if (!geolocationOk) errorReason = errorReasonSupport
		} else {
			try {
				const permsState = await getGeolocationPermissionsState()
				geolocationOk = permsState !== 'denied';
				if (!geolocationOk) errorReason = errorReasonPerms
			} catch {
				// Fix for iOS16 which rejects query but still supports geolocation
				geolocationOk = !!window.navigator.geolocation;
				if (!geolocationOk) errorReason = errorReasonSupport
			}
		}

		geolocationEnabled = geolocationOk
		console.log(geolocationOk)
		if (!geolocationOk && showResult && errorReason) {
			openToast(errorReason)
		}
		return geolocationOk
	}

	function onClick() {
		updateGeolocationEnabled(true).then((ok) => {
			if (!ok) return
			isFetchingLocation = true
			navigator?.geolocation?.getCurrentPosition(
				(s) => {
					isFetchingLocation = false
					geolocate._onSuccess(s)
				},
				(e) => {
					geolocationEnabled = false
					isFetchingLocation = false
					geolocate._onError(e)

					getGeolocationPermissionsState().then(permsState => {
						if (permsState === "granted") {
							openToast(errorReasonUnknown)
						} else {
							openToast(errorReasonPerms)
						}
					})
				},
				{
					enableHighAccuracy: true
				}
			)
		})

	}

	$effect(() => {
		updateGeolocationEnabled().then()
		if (map) geolocate.onAdd(map)
	})

</script>


<BaseFab
	onclick={onClick}
>
	{#if geolocationEnabled}
		<Locate size="24" class={isFetchingLocation ? "fetching-location" : ""} />
	{:else}
		<LocateOff size="24" />
	{/if}
</BaseFab>

<style lang="postcss">
    @keyframes pulse {
        50% {
            @apply text-muted-foreground;
        }
    }
    :global(.fetching-location) {
		animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;

	}
</style>