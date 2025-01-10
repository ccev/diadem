import { json } from '@sveltejs/kit';
import { query } from '@/lib/db.server';
import { readConfig } from '@/lib/config.server';

export async function GET({ params }) {
	const result = await query(
		"SELECT * FROM gym " +
		"WHERE gym.id = ?",
		[params.id]
	)
	return json(result)
}