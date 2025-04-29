import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { setDirectLinkCoordinates, setDirectLinkObject } from '@/lib/directLinks.svelte';
import { getOneMapObject, makeMapObject } from '@/lib/mapObjects/updateMapObject';
import type { GymData } from '@/lib/types/mapObjectData/gym';
import { getCurrentSelectedData } from '@/lib/mapObjects/currentSelectedState.svelte';

export const load: PageLoad = async ({ params }) => {
	if (!browser) return;

	const data: GymData = await getOneMapObject('gym', params.id);

	setDirectLinkCoordinates({
		lat: data?.lat,
		lon: data?.lon
	});
	setDirectLinkObject({
		type: 'gym',
		id: 'gym-' + params.id
	});

	makeMapObject(data, 'gym');

	redirect(302, '/');
};