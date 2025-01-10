import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { setDirectLinkCoordinates, setDirectLinkObject } from '@/lib/directLinks.svelte';
import { getOneMapObject, makeMapObject } from '@/lib/mapObjects/updateMapObject';
import type { StationData } from '@/lib/types/mapObjectData/station';

export const load: PageLoad = async ({ params, fetch }) => {
	if (!browser) return;
	const data: StationData = await getOneMapObject('station', params.id);
	console.log(data);

	setDirectLinkCoordinates({
		lat: data?.lat,
		lon: data?.lon
	});
	setDirectLinkObject({
		type: 'station',
		id: 'station-' + params.id
	});

	makeMapObject(data, 'station');

	redirect(302, '/');
};