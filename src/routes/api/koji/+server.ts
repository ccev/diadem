import { error, json } from '@sveltejs/kit';
import { fetchKojiGeofences } from '@/lib/server/api/kojiApi';
import { getServerConfig } from '@/lib/services/config/config.server';
import type { KojiFeatures } from '@/lib/features/koji';

export async function GET(event) {
	const data = await fetchKojiGeofences(event.fetch)
	if (!data) error(500)

	const kojiConfig = getServerConfig().koji
	if (kojiConfig?.filterByPermissions) {
		const perms = event.locals.perms

		// If user has any "everywhere" permissions, they can see all fences
		if (perms.everywhere && perms.everywhere.length > 0) {
			return json(data)
		}

		// Otherwise, filter to only show fences matching user's permitted areas
		const permittedAreaNames = new Set(
			perms.areas.map(area => area.name.toLowerCase())
		)

		const filteredData: KojiFeatures = data.filter(
			fence => permittedAreaNames.has(fence.properties.name.toLowerCase())
		)

		return json(filteredData)
	}

	return json(data)
}
