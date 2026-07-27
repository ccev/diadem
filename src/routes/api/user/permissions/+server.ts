import { json } from "@sveltejs/kit";
import { noStoreHttpHeaders } from "@/lib/utils/apiUtils.server";
import { removeRedundantPermissionAreas } from "@/lib/utils/features";

export async function GET({ locals }) {
	return json(
		{
			permissions: removeRedundantPermissionAreas(locals.perms)
		},
		{ headers: noStoreHttpHeaders }
	);
}
