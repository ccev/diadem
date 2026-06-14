export function isMysqlError(error: unknown, code: string, errno: number): boolean {
	if (!error || typeof error !== "object") return false;
	const e = error as { code?: string; errno?: number };
	return e.code === code || e.errno === errno;
}
