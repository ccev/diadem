import * as m from "@/lib/paraglide/messages";

type MessageFunction = (params?: Record<string, unknown>) => string;

export function mAny(key: string | keyof typeof m, params?: Record<string, unknown>) {
	const message = (m as unknown as Record<string, MessageFunction | undefined>)[key];
	return typeof message === "function" ? message(params) : (key ?? "");
}
