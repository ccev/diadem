import { json } from '@sveltejs/kit';
import { getClientConfig } from '@/lib/config/config.server';

export async function GET() {
	return json(getClientConfig());
}
