import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { rateLimitConsume } from "@/lib/server/api/rateLimit";
import { respond } from "@/lib/server/api/respond";
import { hasAnyFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { biomesProvider } from "@/lib/server/provider/biomesProvider";
import { FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import { featureFamily } from "@/lib/utils/features";
import { getS2CellCenter, parseS2CellId } from "@/lib/utils/s2";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, locals, request, fetch, getClientAddress }) => {
	if (!biomesProvider.enabled) error(404, "Biomes are disabled");
	const type = MapObjectType.BIOME;
	const family = featureFamily[type];
	if (!hasAnyFeatureAnywhereServer(locals.perms, family, locals.user)) error(401);
	const cell = parseS2CellId(params.id, 16);
	if (cell === undefined) error(400, "Expected a level 16 S2 cell ID");
	const { lat, lon } = getS2CellCenter(cell);
	if (!new FeaturePermissionContext(locals.perms, family).isAllowedAt(type, lat, lon)) error(401);
	const [allowed, , , headers] = await rateLimitConsume(
		locals.user?.id ?? getClientAddress(),
		2,
		type
	);
	if (!allowed) return respond(request, { error: "Rate limited" }, { status: 429, headers });

	return respond(request, await biomesProvider.getPools(params.id, fetch));
};
