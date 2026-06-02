// Universal logger that works on both the server and in the browser

type LogFn = (message: string, ...args: unknown[]) => void;

export interface Logger {
	debug: LogFn;
	info: LogFn;
	warning: LogFn;
	error: LogFn;
	crit: LogFn;
}

let serverLoggerFactory: ((name: string) => Logger) | null = null;

export function setServerLoggerFactory(factory: (name: string) => Logger) {
	serverLoggerFactory = factory;
}

function createBrowserLogger(name: string): Logger {
	const prefix = `[${name}]`;
	return {
		debug: (message, ...args) => console.debug(prefix, message, ...args),
		info: (message, ...args) => console.info(prefix, message, ...args),
		warning: (message, ...args) => console.warn(prefix, message, ...args),
		error: (message, ...args) => console.error(prefix, message, ...args),
		crit: (message, ...args) => console.error(prefix, message, ...args)
	};
}

export function getLogger(name: string): Logger {
	if (serverLoggerFactory) {
		return serverLoggerFactory(name);
	}
	return createBrowserLogger(name);
}

const throttleLastFired = new Map<string, number>();

// Emits a log line at most once per `intervalMs` per `key`. Useful for
// hot-path warnings that would flood the log if emitted on every call.
export function throttledLog(
	log: Logger,
	level: keyof Logger,
	key: string,
	intervalMs: number,
	message: string,
	...args: unknown[]
) {
	const now = Date.now();
	const last = throttleLastFired.get(key) ?? 0;
	if (now - last < intervalMs) return;
	throttleLastFired.set(key, now);
	log[level](message, ...args);
}
