import { json, type RequestEvent } from "@sveltejs/kit";
import { getClientConfig } from "@/lib/services/config/config.server";
import { linkProvider } from "@/lib/server/auth/betterAuth";

// Linking is deliberately a web-only, same-origin POST initiated by a signed-in
// profile. Better Auth binds the current user to its one-time OAuth state.
export async function POST(event: RequestEvent) {
	if (event.request.headers.get("origin") !== event.url.origin)
		return new Response(null, { status: 403 });
	if (!event.locals.user) return new Response(null, { status: 401 });
	const provider = event.params.provider;
	if (
		(provider !== "discord" && provider !== "telegram") ||
		!getClientConfig().auth!.providers.includes(provider)
	)
		return new Response(null, { status: 404 });
	const result = await linkProvider(event, provider, `/login/${provider}/callback`);
	return result?.url ? json({ url: result.url }) : new Response(null, { status: 400 });
}
