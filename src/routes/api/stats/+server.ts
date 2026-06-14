import { masterstatsProvider } from "@/lib/server/provider/masterStatsProvider";
import { json } from "@sveltejs/kit";

export async function GET() {
	try {
		const stats = await masterstatsProvider.get();
		return json(stats);
	} catch (e) {
		return json({
			pokemon: {},
			generatedAt: 0
		});
	}
}
