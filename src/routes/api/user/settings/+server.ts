import { getUserSettings, setUserSettings } from '@/lib/server/auth/db/repository';
import { json } from '@sveltejs/kit';

export async function POST({ locals, request }) {
	if (!locals.user) return json({ error: 'Not logged in' });
	await setUserSettings(locals.user.id, await request.json());
	return json({ error: null });
}

export async function GET({ locals }) {
	if (!locals.user) return json({ error: 'Not logged in', result: {} });

	const userSettings = await getUserSettings(locals.user.id);

	if (!userSettings) return json({ error: 'No data', result: {} });
	
	return json({ result: JSON.parse(userSettings) });
}
