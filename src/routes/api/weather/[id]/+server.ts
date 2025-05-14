import { json } from '@sveltejs/kit';
import { query } from '@/lib/db.server';

export async function GET({ params }) {
	const result = await query(
		'SELECT * FROM weather ' +
			'WHERE id = ?',
		[params.id]
	);
	return json(result);
}