import Piscina from "piscina";

// Internal limits; overrides are used by pool integration tests, not server configuration.
export type CpuWorkerPoolOptions = {
	threads?: number;
	maxQueue?: number;
	maxTaskBytes?: number;
	maxPendingBytes?: number;
	timeoutMs?: number;
	memoryMb?: number;
};

export class CpuWorkerError extends Error {
	readonly code: "busy" | "too-large" | "timeout" | "aborted" | "unavailable" | "failed";

	constructor(code: CpuWorkerError["code"], options?: ErrorOptions) {
		super(`CPU worker ${code}`, options);
		this.name = "CpuWorkerError";
		this.code = code;
	}
}

export class CpuWorkerPool {
	readonly options: Readonly<Required<CpuWorkerPoolOptions>>;
	private readonly pool?: Piscina<ArrayBuffer, ArrayBuffer>;
	private pendingTasks = 0;
	private pendingBytes = 0;
	private activeTasks = 0;
	private readonly waiting: (() => void)[] = [];
	private stopping?: Promise<void>;
	private failure?: unknown;

	constructor(
		filename: string | URL,
		config: CpuWorkerPoolOptions = {},
		onError?: (error: unknown) => void,
		workerData: Record<string, unknown> = {}
	) {
		if (!config || typeof config !== "object" || Array.isArray(config)) {
			throw new TypeError("CPU worker pool options must be an object");
		}
		const options = {
			threads: 0,
			maxQueue: 8,
			maxTaskBytes: 4 * 1024 * 1024,
			maxPendingBytes: 16 * 1024 * 1024,
			timeoutMs: 5000,
			memoryMb: 128,
			...config
		};
		for (const [name, value] of Object.entries(options)) {
			const min = name === "threads" || name === "maxQueue" ? 0 : 1;
			if (!Number.isSafeInteger(value) || value < min) {
				throw new RangeError(`CPU worker pool ${name} must be an integer >= ${min}`);
			}
		}
		if (options.timeoutMs > 2 ** 31 - 1 || options.memoryMb < 16) {
			throw new RangeError("CPU worker pool requires timeoutMs <= 2147483647 and memoryMb >= 16");
		}
		if (
			options.maxPendingBytes < options.maxTaskBytes ||
			!Number.isSafeInteger(options.threads + options.maxQueue)
		) {
			throw new RangeError("Invalid CPU worker pool byte budget or task capacity");
		}
		this.options = Object.freeze(options);
		if (!this.enabled) return;

		this.pool = new Piscina({
			filename: filename.toString(),
			minThreads: options.threads,
			maxThreads: options.threads,
			maxQueue: 0,
			concurrentTasksPerWorker: 1,
			resourceLimits: { maxOldGenerationSizeMb: options.memoryMb },
			workerData: { ...workerData, maxTaskBytes: options.maxTaskBytes },
			execArgv: [],
			recordTiming: false
		});
		this.pool.on("error", (error: unknown) => {
			// Idle/bootstrap failures must not crash the server or cause an inline CPU retry.
			this.failure = error;
			void this.close();
			onError?.(error);
		});
	}

	get enabled() {
		return this.options.threads > 0;
	}

	get load() {
		return { tasks: this.pendingTasks, bytes: this.pendingBytes };
	}

	// Admission precedes encoding. The factory must return an owned, transferable buffer.
	async run(encode: () => ArrayBuffer, signal?: AbortSignal): Promise<ArrayBuffer> {
		if (signal?.aborted) throw new CpuWorkerError("aborted");
		if (!this.pool || this.stopping) {
			throw new CpuWorkerError("unavailable", { cause: this.failure });
		}
		const { threads, maxQueue, maxTaskBytes, maxPendingBytes, timeoutMs } = this.options;
		if (this.pendingTasks >= threads + maxQueue || this.pendingBytes >= maxPendingBytes) {
			throw new CpuWorkerError("busy");
		}

		this.pendingTasks++;
		let reservedBytes = 0;
		let hasSlot = false;
		const started = performance.now();
		const controller = new AbortController();
		const abort = () => controller.abort(new CpuWorkerError("aborted"));
		signal?.addEventListener("abort", abort, { once: true });
		const timer = setTimeout(() => controller.abort(new CpuWorkerError("timeout")), timeoutMs);
		timer.unref();
		try {
			const input = encode();
			if (!(input instanceof ArrayBuffer)) throw new TypeError("Expected an owned ArrayBuffer");
			if (input.byteLength > maxTaskBytes) throw new CpuWorkerError("too-large");
			if (input.byteLength > maxPendingBytes - this.pendingBytes) {
				throw new CpuWorkerError("busy");
			}
			reservedBytes = input.byteLength;
			this.pendingBytes += reservedBytes;
			if (performance.now() - started >= timeoutMs) {
				controller.abort(new CpuWorkerError("timeout"));
			}
			if (controller.signal.aborted) throw controller.signal.reason;
			// Piscina reorders its abortable-task queue. Reserve a FIFO slot before dispatch.
			if (this.activeTasks >= threads) {
				await new Promise<void>((resolve, reject) => {
					const start = () => {
						controller.signal.removeEventListener("abort", cancel);
						this.activeTasks++;
						hasSlot = true;
						resolve();
					};
					const cancel = () => {
						const index = this.waiting.indexOf(start);
						if (index !== -1) this.waiting.splice(index, 1);
						reject(controller.signal.reason);
					};
					this.waiting.push(start);
					controller.signal.addEventListener("abort", cancel, { once: true });
				});
			} else {
				this.activeTasks++;
				hasSlot = true;
			}
			if (this.stopping) throw new CpuWorkerError("unavailable", { cause: this.failure });
			const output = await this.pool.run(input, {
				transferList: [input],
				signal: controller.signal
			});
			if (controller.signal.aborted) throw controller.signal.reason;
			if (!(output instanceof ArrayBuffer) || output.byteLength > maxTaskBytes) {
				throw new CpuWorkerError("failed");
			}
			return output;
		} catch (error) {
			if (controller.signal.aborted) throw controller.signal.reason;
			if (error instanceof CpuWorkerError) throw error;
			throw new CpuWorkerError("failed", { cause: error });
		} finally {
			clearTimeout(timer);
			signal?.removeEventListener("abort", abort);
			this.pendingTasks--;
			this.pendingBytes -= reservedBytes;
			if (hasSlot) {
				this.activeTasks--;
				this.waiting.shift()?.();
			}
		}
	}

	close(): Promise<void> {
		return (this.stopping ??= this.pool?.destroy() ?? Promise.resolve());
	}
}
