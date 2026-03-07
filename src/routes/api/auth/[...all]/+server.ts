import type { RequestHandler } from "./$types";
import { toSvelteKitHandler } from "better-auth/svelte-kit";
import { auth } from "@/lib/server/auth/betterAuth";

const handler = auth ? toSvelteKitHandler(auth) : null;

function notFound() {
	return new Response(null, { status: 404 });
}

export const GET: RequestHandler = async (event) => {
	if (!handler) return notFound();
	return handler(event);
};

export const POST: RequestHandler = async (event) => {
	if (!handler) return notFound();
	return handler(event);
};

export const PUT: RequestHandler = async (event) => {
	if (!handler) return notFound();
	return handler(event);
};

export const PATCH: RequestHandler = async (event) => {
	if (!handler) return notFound();
	return handler(event);
};

export const DELETE: RequestHandler = async (event) => {
	if (!handler) return notFound();
	return handler(event);
};

export const OPTIONS: RequestHandler = async (event) => {
	if (!handler) return notFound();
	return handler(event);
};
