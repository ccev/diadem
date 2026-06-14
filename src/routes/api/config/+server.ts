import { getClientConfig } from "@/lib/services/config/config.server";
import { json } from "@sveltejs/kit";

export async function GET() {
	return json(getClientConfig());
}
