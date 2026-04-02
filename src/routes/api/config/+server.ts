import { json } from "@sveltejs/kit";
import { getClientConfig } from "@/lib/services/config/config.server";

export async function GET() {
	return json(getClientConfig());
}
