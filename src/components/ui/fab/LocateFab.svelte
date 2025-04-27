<script lang="ts">
	import BaseFab from '@/components/ui/fab/BaseFab.svelte';
	import { Locate, LocateOff } from 'lucide-svelte';
	import maplibre from 'maplibre-gl';
	import { openToast } from '@/components/ui/toast/toastUtils.svelte';
	import { tick } from 'svelte';
	import { setIsContextMenuOpen } from '@/components/ui/contextmenu/utils.svelte';
	import * as m from "@/lib/paraglide/messages"

	let {
		map
	}: {
		map: maplibre.Map | undefined
	} = $props()

	const errorReasonSupport = m.locate_error_support()
	const errorReasonPerms = m.locate_error_perms()
	const errorReasonTimeout = m.locate_error_timeout()
	const errorReasonUnknown = m.locate_error_unknown()

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
		if (!geolocationOk && showResult && errorReason) {
			openToast(errorReason)
		}
		return geolocationOk
	}

	function onClick() {
		setIsContextMenuOpen(false)
		isFetchingLocation = true
		navigator?.geolocation?.getCurrentPosition(
			(s) => {
				isFetchingLocation = false
				geolocate._onSuccess(s)
			},
			(e) => {
				if (e.code === 1) {
					openToast(errorReasonPerms)
				} else if (e.code === 2) {
					openToast(errorReasonTimeout)
				} else {
					openToast(errorReasonUnknown)
				}

				geolocationEnabled = false
				isFetchingLocation = false
				geolocate._onError(e)
			},
			{
				enableHighAccuracy: true
			}
		)
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
			color: var(--muted-foreground);
        }
    }
    :global(.fetching-location) {
		animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;

	}
</style>