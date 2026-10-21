import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { markAsUntransferable } from "node:worker_threads";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GeometryWorkersConfig } from "@/lib/services/config/configTypes";
import { CpuWorkerError, CpuWorkerPool } from "./pool";

const filename = new URL("./test-fixtures/pool-worker.mjs", import.meta.url);
const missingFilename = new URL("./test-fixtures/does-not-exist.mjs", import.meta.url);
const workerConfig = { threads: 1, memoryMb: 32 };
const pools: CpuWorkerPool[] = [];

function createPool(
	config: GeometryWorkersConfig = workerConfig,
	workerFilename: string | URL = filename,
	onError?: (error: unknown) => void
) {
	const pool = new CpuWorkerPool(workerFilename, config, onError);
	pools.push(pool);
	return pool;
}

function task(
	command: "echo" | "delay" | "throw" | "crash" | "invalid" | "oversized" | "mutate" = "echo",
	{ bytes = 8, delayMs = 0, value = 0 } = {}
) {
	const buffer = new ArrayBuffer(bytes);
	const view = new DataView(buffer);
	view.setUint8(0, command.charCodeAt(0));
	view.setUint32(1, delayMs, true);
	view.setUint8(bytes - 1, value);
	return buffer;
}

// Attach rejection handlers immediately, including when a later assertion fails before cleanup.
function settled(promise: Promise<ArrayBuffer>) {
	return promise.then(
		(value) => ({ status: "fulfilled", value }) as const,
		(reason: unknown) => ({ status: "rejected", reason }) as const
	);
}

async function expectError(promise: Promise<ArrayBuffer>, code: CpuWorkerError["code"]) {
	const result = await settled(promise);
	expect(result.status).toBe("rejected");
	if (result.status !== "rejected") throw new Error("Expected the worker task to reject");
	expect(result.reason).toBeInstanceOf(CpuWorkerError);
	expect(result.reason).toMatchObject({ name: "CpuWorkerError", code });
	return result.reason as CpuWorkerError;
}

afterEach(async () => {
	const closing = pools.splice(0);
	await Promise.all(closing.map((pool) => pool.close()));
	for (const pool of closing) expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
});

describe("CpuWorkerPool integration", () => {
	it("defaults to disabled without loading the worker or encoding requests", async () => {
		const onError = vi.fn();
		const pool = createPool({}, missingFilename, onError);
		const encode = vi.fn(() => task());

		expect(pool.options).toEqual({
			threads: 0,
			maxQueue: 8,
			maxTaskBytes: 4 * 1024 * 1024,
			maxPendingBytes: 16 * 1024 * 1024,
			timeoutMs: 5000,
			memoryMb: 128
		});
		expect(pool.enabled).toBe(false);
		await expectError(pool.run(encode), "unavailable");
		const closing = pool.close();
		expect(pool.close()).toBe(closing);
		await closing;
		await expectError(pool.run(encode), "unavailable");
		expect(pool.enabled).toBe(false);
		expect(encode).not.toHaveBeenCalled();
		expect(onError).not.toHaveBeenCalled();
	});

	it("copies and freezes configuration and preserves enabled mode after closing", async () => {
		const config = { ...workerConfig, maxQueue: 0 };
		const pool = createPool(config, fileURLToPath(filename));
		config.threads = 0;
		config.maxQueue = 99;

		expect(Object.isFrozen(pool.options)).toBe(true);
		expect(Reflect.set(pool.options, "threads", 0)).toBe(false);
		expect(pool.options).toMatchObject({ ...workerConfig, maxQueue: 0 });
		await expect(pool.run(() => task())).resolves.toBeInstanceOf(ArrayBuffer);
		await pool.close();
		expect(pool.enabled).toBe(true);
	});

	it("rejects non-table configuration before starting workers", () => {
		for (const config of [null, [], 1, "workers", true]) {
			expect(() => createPool(config as unknown as GeometryWorkersConfig)).toThrow(TypeError);
		}
	});

	it("rejects invalid integer limits, unsafe capacities, and inconsistent byte budgets", () => {
		const invalid = [
			{ threads: -1 },
			{ threads: 1.5 },
			{ maxQueue: Number.MAX_SAFE_INTEGER + 1 },
			{ maxQueue: -1 },
			{ maxTaskBytes: 0 },
			{ maxPendingBytes: NaN },
			{ timeoutMs: 0 },
			{ timeoutMs: Infinity },
			{ timeoutMs: 2 ** 31 },
			{ memoryMb: "32" },
			{ memoryMb: 15 },
			{ maxTaskBytes: 16, maxPendingBytes: 15 },
			{ ...workerConfig, maxQueue: Number.MAX_SAFE_INTEGER }
		];
		for (const config of invalid) {
			expect(() => createPool(config as GeometryWorkersConfig), JSON.stringify(config)).toThrow(
				RangeError
			);
		}
	});

	it("admits one running job with maxQueue zero and refuses overflow before encoding", async () => {
		const pool = createPool({ ...workerConfig, maxQueue: 0 });
		await pool.run(() => task());
		const input = task("delay", { delayMs: 150 });
		const active = settled(pool.run(() => input));
		const encode = vi.fn(() => task());

		expect(input.byteLength).toBe(0);
		expect(pool.load).toEqual({ tasks: 1, bytes: 8 });
		await expectError(pool.run(encode), "busy");
		expect(encode).not.toHaveBeenCalled();
		expect(pool.load).toEqual({ tasks: 1, bytes: 8 });
		expect(await active).toMatchObject({ status: "fulfilled" });
		expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
		await expect(pool.run(encode)).resolves.toBeInstanceOf(ArrayBuffer);
		expect(encode).toHaveBeenCalledTimes(1);
	});

	it("counts active and queued jobs and rejects queue overflow without encoding", async () => {
		const pool = createPool({ ...workerConfig, maxQueue: 1 });
		await pool.run(() => task());
		const active = settled(pool.run(() => task("delay", { bytes: 16, delayMs: 150 })));
		const queuedInput = task("echo", { bytes: 24 });
		const queued = settled(pool.run(() => queuedInput));
		const encode = vi.fn(() => task());

		expect(queuedInput.byteLength).toBe(24);
		expect(pool.load).toEqual({ tasks: 2, bytes: 40 });
		const snapshot = pool.load;
		snapshot.tasks = 100;
		snapshot.bytes = 100;
		await expectError(pool.run(encode), "busy");
		expect(encode).not.toHaveBeenCalled();
		expect(pool.load).toEqual({ tasks: 2, bytes: 40 });
		expect(await active).toMatchObject({ status: "fulfilled" });
		expect(await queued).toMatchObject({ status: "fulfilled" });
		expect(queuedInput.byteLength).toBe(0);
		expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
	});

	it("enforces the aggregate byte cap independently of queue capacity", async () => {
		const pool = createPool({
			...workerConfig,
			maxQueue: 4,
			maxTaskBytes: 16,
			maxPendingBytes: 24
		});
		await pool.run(() => task());
		const active = settled(pool.run(() => task("delay", { bytes: 16, delayMs: 200 })));
		const crossingInput = task("echo", { bytes: 9 });
		const crossingEncode = vi.fn(() => crossingInput);

		await expectError(pool.run(crossingEncode), "busy");
		expect(crossingEncode).toHaveBeenCalledTimes(1);
		expect(crossingInput.byteLength).toBe(9);
		expect(pool.load).toEqual({ tasks: 1, bytes: 16 });

		const queued = settled(pool.run(() => task()));
		const fullEncode = vi.fn(() => task());
		expect(pool.load).toEqual({ tasks: 2, bytes: 24 });
		await expectError(pool.run(fullEncode), "busy");
		expect(fullEncode).not.toHaveBeenCalled();
		expect(await active).toMatchObject({ status: "fulfilled" });
		expect(await queued).toMatchObject({ status: "fulfilled" });
		expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
		await expect(pool.run(() => crossingInput)).resolves.toHaveProperty("byteLength", 9);
	});

	it("dispatches cancellable waiting jobs in FIFO order without starving earlier requests", async () => {
		const pool = createPool({ ...workerConfig, maxQueue: 3 });
		await pool.run(() => task());
		const completed: number[] = [];
		await Promise.all(
			[1, 2, 3, 4].map(async (value) => {
				const output = await pool.run(() => task("delay", { delayMs: 30, value }));
				completed.push(new Uint8Array(output)[7]);
			})
		);
		expect(completed).toEqual([1, 2, 3, 4]);
	});

	it("rejects oversized inputs without transferring and admits the exact size limit", async () => {
		const pool = createPool({ ...workerConfig, maxTaskBytes: 8, maxPendingBytes: 8 });
		const input = task("echo", { bytes: 9 });
		await expectError(
			pool.run(() => input),
			"too-large"
		);
		expect(input.byteLength).toBe(9);
		expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
		await expect(pool.run(() => task())).resolves.toHaveProperty("byteLength", 8);
	});

	it("rejects non-owned and untransferable input and releases every reservation", async () => {
		const pool = createPool({ ...workerConfig, maxQueue: 0 });
		await pool.run(() => task());
		const marked = task();
		markAsUntransferable(marked);
		const detached = task();
		structuredClone(detached, { transfer: [detached] });

		for (const input of [new Uint8Array(8), new SharedArrayBuffer(8), null, marked, detached]) {
			const encode = vi.fn(() => input as ArrayBuffer);
			await expectError(pool.run(encode), "failed");
			expect(encode).toHaveBeenCalledTimes(1);
			expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
			await expect(pool.run(() => task())).resolves.toHaveProperty("byteLength", 8);
		}
		expect(marked.byteLength).toBe(8);
	});

	it("transfers the owned input, detaches all its views, and returns intact owned bytes", async () => {
		const pool = createPool();
		const input = task("echo", { value: 42 });
		const view = new Uint8Array(input);
		const expected = Array.from(view);
		const output = await pool.run(() => input);

		expect(input.byteLength).toBe(0);
		expect(view.byteLength).toBe(0);
		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(Array.from(new Uint8Array(output))).toEqual(expected);
		const transferred = structuredClone(output, { transfer: [output] });
		expect(output.byteLength).toBe(0);
		expect(Array.from(new Uint8Array(transferred))).toEqual(expected);
	});

	it("keeps concurrent requests and later output mutations isolated", async () => {
		const pool = createPool({ ...workerConfig, threads: 2, maxQueue: 2 });
		const source = [11, 22, 33, 44];
		const inputs = source.map((value) => task("mutate", { value }));
		const outputs = await Promise.all(inputs.map((input) => pool.run(() => input)));

		expect(source).toEqual([11, 22, 33, 44]);
		expect(inputs.every((input) => input.byteLength === 0)).toBe(true);
		expect(outputs.map((output) => new Uint8Array(output)[7])).toEqual([12, 23, 34, 45]);
		new Uint8Array(outputs[0]).fill(255);
		expect(new Uint8Array(outputs[1])[7]).toBe(23);
		const next = await pool.run(() => task("mutate", { value: 11 }));
		expect(new Uint8Array(next)[7]).toBe(12);
		expect(new Uint8Array(outputs[2])[7]).toBe(34);
		expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
	});

	it("releases admission after encoding throws without retrying the encoder", async () => {
		const pool = createPool({ ...workerConfig, maxQueue: 0 });
		const cause = new Error("Cannot encode request");
		const encode = vi.fn((): ArrayBuffer => {
			expect(pool.load).toEqual({ tasks: 1, bytes: 0 });
			throw cause;
		});

		const error = await expectError(pool.run(encode), "failed");
		expect(error.cause).toBe(cause);
		expect(encode).toHaveBeenCalledTimes(1);
		expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
		await expect(pool.run(() => task())).resolves.toBeInstanceOf(ArrayBuffer);
	});

	it("reports worker exceptions without retrying and allows the next request", async () => {
		const pool = createPool({ ...workerConfig, maxQueue: 0 });
		const encode = vi.fn(() => task("throw"));
		const error = await expectError(pool.run(encode), "failed");

		expect(error.cause).toMatchObject({ message: "Fixture task failed" });
		expect(encode).toHaveBeenCalledTimes(1);
		expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
		await expect(pool.run(() => task())).resolves.toBeInstanceOf(ArrayBuffer);
	});

	it("releases a crashed worker's job and processes queued work on its replacement", async () => {
		const pool = createPool({ ...workerConfig, maxQueue: 1 });
		await pool.run(() => task());
		const encode = vi.fn(() => task("crash"));
		const crashed = expectError(pool.run(encode), "failed");
		const next = settled(pool.run(() => task("echo", { value: 73 })));

		await crashed;
		expect(encode).toHaveBeenCalledTimes(1);
		const result = await next;
		expect(result.status).toBe("fulfilled");
		if (result.status === "fulfilled") expect(new Uint8Array(result.value)[7]).toBe(73);
		expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
	});

	it.each(["invalid", "oversized"] as const)(
		"rejects %s worker output and releases its input budget",
		async (command) => {
			const pool = createPool({
				...workerConfig,
				maxQueue: 0,
				maxTaskBytes: 8,
				maxPendingBytes: 8
			});
			const input = task(command);
			await expectError(
				pool.run(() => input),
				"failed"
			);
			expect(input.byteLength).toBe(0);
			expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
			await expect(pool.run(() => task())).resolves.toHaveProperty("byteLength", 8);
		}
	);

	it("times out running work, releases capacity, and does not poison the next job", async () => {
		const pool = createPool({ ...workerConfig, maxQueue: 0, timeoutMs: 400 });
		await pool.run(() => task());
		const input = task("delay", { delayMs: 2000 });
		const encode = vi.fn(() => input);
		const timedOut = expectError(pool.run(encode), "timeout");

		expect(input.byteLength).toBe(0);
		await timedOut;
		expect(encode).toHaveBeenCalledTimes(1);
		expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
		await expect(pool.run(() => task())).resolves.toBeInstanceOf(ArrayBuffer);
	});

	it("includes queue waiting in the deadline instead of granting a fresh execution timeout", async () => {
		const pool = createPool({ ...workerConfig, maxQueue: 1, timeoutMs: 650 });
		await pool.run(() => task());
		const active = settled(pool.run(() => task("delay", { delayMs: 400 })));
		const input = task("delay", { delayMs: 400 });
		const queued = expectError(
			pool.run(() => input),
			"timeout"
		);

		expect(input.byteLength).toBe(8);
		expect(pool.load).toEqual({ tasks: 2, bytes: 16 });
		expect(await active).toMatchObject({ status: "fulfilled" });
		await queued;
		expect(input.byteLength).toBe(0);
		expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
		await expect(pool.run(() => task())).resolves.toBeInstanceOf(ArrayBuffer);
	});

	it("does not dispatch work whose deadline expired during synchronous encoding", async () => {
		const pool = createPool({ ...workerConfig, timeoutMs: 300 });
		await pool.run(() => task());
		const input = task();
		const encode = vi.fn(() => {
			// Block without burning CPU so the post-encoding deadline check must catch expiry.
			Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 350);
			return input;
		});

		await expectError(pool.run(encode), "timeout");
		expect(input.byteLength).toBe(8);
		expect(encode).toHaveBeenCalledTimes(1);
		expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
		await expect(pool.run(() => task())).resolves.toBeInstanceOf(ArrayBuffer);
	});

	it("rejects already-aborted requests before admission or encoding", async () => {
		const pool = createPool();
		const encode = vi.fn(() => task());
		await expectError(pool.run(encode, AbortSignal.abort(new Error("Disconnected"))), "aborted");
		expect(encode).not.toHaveBeenCalled();
		expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
		await expect(pool.run(encode)).resolves.toBeInstanceOf(ArrayBuffer);
	});

	it("cancels queued work without transferring it or disturbing the running job", async () => {
		const pool = createPool({ ...workerConfig, maxQueue: 1 });
		await pool.run(() => task());
		const active = settled(pool.run(() => task("delay", { delayMs: 200 })));
		const controller = new AbortController();
		const input = task();
		const queued = expectError(
			pool.run(() => input, controller.signal),
			"aborted"
		);
		expect(pool.load).toEqual({ tasks: 2, bytes: 16 });

		controller.abort(new Error("Client disconnected"));
		await queued;
		expect(input.byteLength).toBe(8);
		expect(pool.load).toEqual({ tasks: 1, bytes: 8 });
		const replacement = settled(pool.run(() => task()));
		expect(await active).toMatchObject({ status: "fulfilled" });
		expect(await replacement).toMatchObject({ status: "fulfilled" });
		expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
	});

	it("cancels running work and accepts a fresh job on the replacement worker", async () => {
		const pool = createPool({ ...workerConfig, maxQueue: 0 });
		await pool.run(() => task());
		const controller = new AbortController();
		const input = task("delay", { delayMs: 2000 });
		const active = expectError(
			pool.run(() => input, controller.signal),
			"aborted"
		);
		expect(input.byteLength).toBe(0);

		controller.abort();
		await active;
		expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
		await expect(pool.run(() => task())).resolves.toBeInstanceOf(ArrayBuffer);
	});

	it("does not let completed requests' deadlines or late aborts cancel later work", async () => {
		const pool = createPool({ ...workerConfig, timeoutMs: 600 });
		await pool.run(() => task());
		await pool.run(() => task("delay", { delayMs: 350 }));
		// This job crosses the previous job's deadline but not its own.
		await expect(pool.run(() => task("delay", { delayMs: 350 }))).resolves.toHaveProperty(
			"byteLength",
			8
		);

		const controller = new AbortController();
		await pool.run(() => task(), controller.signal);
		const next = settled(pool.run(() => task("delay", { delayMs: 100 })));
		controller.abort();
		expect(await next).toMatchObject({ status: "fulfilled" });
		expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
	});

	it("contains missing-module startup errors both idle and with queued requests", async () => {
		// No process error handlers: Vitest must still report any uncaught error or rejection.
		for (const submit of [false, true]) {
			const onError = vi.fn();
			const pool = createPool(workerConfig, missingFilename, onError);
			const pending = submit
				? expectError(
						pool.run(() => task()),
						"failed"
					)
				: undefined;

			await expect.poll(() => onError.mock.calls.length, { timeout: 2000 }).toBe(1);
			await pending;
			const cause = onError.mock.calls[0][0];
			expect(cause).toMatchObject({ code: "ERR_MODULE_NOT_FOUND" });
			const encode = vi.fn(() => task());
			const error = await expectError(pool.run(encode), "unavailable");
			expect(error.cause).toBe(cause);
			expect(encode).not.toHaveBeenCalled();
			expect(pool.enabled).toBe(true);
			await pool.close();
			expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
			await delay(20);
			expect(onError).toHaveBeenCalledTimes(1);
		}
	});

	it("closes active and queued work idempotently and refuses new encoding immediately", async () => {
		const pool = createPool({ ...workerConfig, maxQueue: 1 });
		await pool.run(() => task());
		const activeInput = task("delay", { delayMs: 2000 });
		const queuedInput = task();
		const active = expectError(
			pool.run(() => activeInput),
			"failed"
		);
		const queued = expectError(
			pool.run(() => queuedInput),
			"unavailable"
		);
		expect(activeInput.byteLength).toBe(0);
		expect(queuedInput.byteLength).toBe(8);
		expect(pool.load).toEqual({ tasks: 2, bytes: 16 });

		const closing = pool.close();
		expect(pool.close()).toBe(closing);
		const encode = vi.fn(() => task());
		await expectError(pool.run(encode), "unavailable");
		await Promise.all([active, queued, closing]);
		expect(pool.load).toEqual({ tasks: 0, bytes: 0 });
		expect(queuedInput.byteLength).toBe(8);
		expect(pool.close()).toBe(closing);
		expect(pool.enabled).toBe(true);
		await expectError(pool.run(encode), "unavailable");
		expect(encode).not.toHaveBeenCalled();
	});
});
