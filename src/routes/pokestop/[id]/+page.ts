import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { setDirectLinkCoordinates, setDirectLinkObject } from '@/lib/directLinks.svelte';
import { makeMapObject, getOneMapObject } from '@/lib/mapObjects/updateMapObject';
import type { PokestopData } from '@/lib/types/mapObjectData/pokestop';

export const load: PageLoad = async ({ params, fetch }) => {
	if (!browser) return;
	const data: PokestopData = await getOneMapObject("pokestop", params.id)
	console.log(data)

	setDirectLinkCoordinates({
		lat: data?.lat,
		lon: data?.lon
	});
	setDirectLinkObject({
		type: 'pokestop',
		id: 'pokestop-' + params.id
	});

	makeMapObject(data, 'pokestop');

	redirect(302, '/');
};