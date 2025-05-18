import { json } from '@sveltejs/kit';
import { getUserInfo } from '@/lib/server/auth/discordDetails';

export async function GET({ locals }) {
	if (!locals.user) return json({});

	const data = await getUserInfo(locals.session.discordToken);
	return json({
		details: data,
		permissions: locals.user.permissions
	});
}
