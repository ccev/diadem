import { respond } from "@/lib/server/api/respond";
import { removeRedundantPermissionAreas } from "@/lib/utils/features";

export async function GET({ locals, request }) {
	return respond(request, {
		permissions: removeRedundantPermissionAreas(locals.perms)
	});
}
