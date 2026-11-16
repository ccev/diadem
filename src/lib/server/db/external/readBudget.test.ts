import { afterEach, expect, it, vi } from "vitest";
import { ReadBudget } from "./readBudget";

afterEach(() => vi.useRealTimers());

it("bounds active work and queue size, preserves FIFO, and releases slots on failure", async () => {
	const budget = new ReadBudget(1, 1, 1000);
	let finish!: () => void;
	const first = budget.run(
		() =>
			new Promise<void>((resolve) => {
				finish = resolve;
			})
	);
	const load = vi.fn().mockRejectedValue(new Error("SQL failed"));
	const queued = budget.run(load);
	const rejected = expect(queued).rejects.toThrow("SQL failed");
	await expect(budget.run(load)).rejects.toThrow("queue full");
	expect(load).not.toHaveBeenCalled();
	finish();
	await first;
	await rejected;
	expect(load).toHaveBeenCalledOnce();
	expect(await budget.run(async () => 42)).toBe(42);
});

it("expires queued jobs without running them or losing capacity", async () => {
	vi.useFakeTimers();
	const budget = new ReadBudget(1, 1, 100);
	let finish!: () => void;
	const first = budget.run(
		() =>
			new Promise<void>((resolve) => {
				finish = resolve;
			})
	);
	const load = vi.fn();
	const queued = expect(budget.run(load)).rejects.toThrow("queue timeout");
	await vi.advanceTimersByTimeAsync(100);
	await queued;
	finish();
	await first;
	expect(load).not.toHaveBeenCalled();
	expect(await budget.run(async () => 42)).toBe(42);
});
