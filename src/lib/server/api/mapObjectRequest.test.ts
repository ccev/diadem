import type { AnyFilter } from "@/lib/features/filters/filters";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { rememberFilter } from "@/lib/server/api/filterCache";
import { checkFeaturesInBoundsServer } from "@/lib/server/workers/geometry";
import { CpuWorkerError } from "@/lib/server/workers/pool";
import type { PermittedBounds } from "@/lib/services/user/checkPerm";
import { getFilterHash } from "@/lib/utils/filterHash";
import { featureFamily, Features } from "@/lib/utils/features";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$app/environment", () => ({ building: false, dev: true }));
vi.mock("@/lib/services/config/config.server", () => ({ getServerConfig: () => ({}) }));
vi.mock("@/lib/server/workers/geometry", async (importOriginal) => {
	const original = await importOriginal<typeof import("@/lib/server/workers/geometry")>();
	return {
		...original,
		checkFeaturesInBoundsServer: vi.fn(original.checkFeaturesInBoundsServer)
	};
});

const limiter = vi.hoisted(() => ({
	consume: vi.fn(),
	reward: vi.fn(),
	penalty: vi.fn()
}));
vi.mock("@/lib/server/api/rateLimit", async (importOriginal) => {
	const original = await importOriginal<typeof import("@/lib/server/api/rateLimit")>();
	return {
		...original,
		rateLimitConsume: limiter.consume,
		rateLimitReward: limiter.reward,
		rateLimit: limiter.penalty
	};
});
const auth = vi.hoisted(() => ({ allowed: true }));
vi.mock("@/lib/server/auth/checkIfAuthed", () => ({
	hasAnyFeatureAnywhereServer: () => auth.allowed
}));

import {
	admitType,
	isValidBounds,
	refundDenied,
	requestSince,
	resolveTypeRequest,
	settleTypeRequest
} from "@/lib/server/api/mapObjectRequest";
import { requestLimits } from "@/lib/server/api/rateLimit";

const bounds = { minLat: 0, minLon: 0, maxLat: 1, maxLon: 1 };
const locals = {
	user: { id: "u1" },
	perms: { everywhere: [Features.GYM, Features.RAID], areas: [] }
} as unknown as App.Locals;
const type = MapObjectType.GYM;
const limit = requestLimits[type];
const filter = { category: "gym", enabled: true } as unknown as AnyFilter;

beforeEach(() => {
	limiter.consume.mockReset().mockResolvedValue([true, 5, 10, { "X-RateLimit-Remaining": "5" }]);
	limiter.reward.mockReset().mockResolvedValue(7);
	limiter.penalty.mockReset().mockResolvedValue(3);
	vi.mocked(checkFeaturesInBoundsServer).mockReset();
	auth.allowed = true;
});

describe("isValidBounds / requestSince", () => {
	it("accepts finite bounds and rejects anything else", () => {
		expect(isValidBounds(bounds)).toBe(true);
		expect(isValidBounds({ ...bounds, maxLon: "1" })).toBe(false);
		expect(isValidBounds([])).toBe(false);
		expect(isValidBounds(null)).toBe(false);
	});

	it("passes a finite since through and drops anything else", () => {
		expect(requestSince({ since: 100 })).toBe(100);
		expect(requestSince({ since: Number.NaN })).toBeUndefined();
		expect(requestSince({})).toBeUndefined();
	});
});

describe("admitType", () => {
	it("returns 401 without consuming when the family is not permitted", async () => {
		auth.allowed = false;
		expect(await admitType(type, locals, "u1")).toEqual({ status: 401 });
		expect(limiter.consume).not.toHaveBeenCalled();
	});

	it("returns 429 with the limiter headers when consume is refused", async () => {
		limiter.consume.mockResolvedValue([false, 0, 10, { "Retry-After": "3" }]);
		expect(await admitType(type, locals, "u1")).toEqual({
			status: 429,
			headers: { "Retry-After": "3" },
			totalLimit: 10
		});
	});

	it("consumes the type's request limit and returns it", async () => {
		expect(await admitType(type, locals, "u1")).toEqual({
			status: 200,
			requestLimit: limit,
			totalLimit: 10
		});
		expect(limiter.consume).toHaveBeenCalledWith("u1", limit, type);
	});
});

describe("refundDenied", () => {
	it("refunds all but the denied charge", async () => {
		await refundDenied(type, "u1", limit);
		expect(limiter.reward).toHaveBeenCalledWith("u1", limit - 100, type);
	});

	it("refunds nothing when the limit is below the denied charge", async () => {
		await refundDenied(type, "u1", 50);
		expect(limiter.reward).not.toHaveBeenCalled();
	});
});

describe("resolveTypeRequest", () => {
	it("returns the permitted bounds, context and filter for a plain request", async () => {
		const out = await resolveTypeRequest(type, locals, "u1", limit, bounds, { filter });
		expect(out.status).toBe(200);
		if (out.status !== 200) return;
		expect(out.filter).toBe(filter);
		expect(out.permitted).toEqual({ bounds, polygon: null });
		expect(out.context.allowedEverywhere(Features.GYM)).toBe(true);
		expect(out.context.allowedEverywhere(Features.RAID)).toBe(true);
		expect(out.filterCached).toBeUndefined();
		expect(limiter.reward).not.toHaveBeenCalled();
	});

	it("awaits geometry and forwards the request signal", async () => {
		const geometry = Promise.withResolvers<PermittedBounds | null>();
		vi.mocked(checkFeaturesInBoundsServer).mockReturnValueOnce(geometry.promise);
		const signal = new AbortController().signal;
		const pending = resolveTypeRequest(type, locals, "u1", limit, bounds, { filter }, signal);
		expect(checkFeaturesInBoundsServer).toHaveBeenCalledExactlyOnceWith(
			locals.perms,
			featureFamily[type],
			bounds,
			signal
		);
		expect(vi.mocked(checkFeaturesInBoundsServer).mock.calls[0][3]).toBe(signal);
		const permitted = { bounds: { ...bounds, maxLat: 0.5 }, polygon: null };
		geometry.resolve(permitted);
		const out = await pending;
		expect(out).toMatchObject({ status: 200, permitted, filter });
		expect(limiter.reward).not.toHaveBeenCalled();
	});

	it.each(["busy", "too-large", "timeout", "aborted", "unavailable", "failed"] as const)(
		"returns 503 and refunds the full reservation once for worker %s",
		async (code) => {
			const reserved = 500;
			vi.mocked(checkFeaturesInBoundsServer).mockRejectedValueOnce(new CpuWorkerError(code));
			expect(await resolveTypeRequest(type, locals, "u1", reserved, bounds, {})).toEqual({
				status: 503
			});
			expect(checkFeaturesInBoundsServer).toHaveBeenCalledTimes(1);
			expect(limiter.reward).toHaveBeenCalledExactlyOnceWith("u1", reserved, type);
			expect(limiter.consume).not.toHaveBeenCalled();
			expect(limiter.penalty).not.toHaveBeenCalled();
		}
	);

	it("returns 503 with a full refund for an already-aborted request on the inline path", async () => {
		const controller = new AbortController();
		controller.abort();
		expect(
			await resolveTypeRequest(type, locals, "u1", limit, bounds, {}, controller.signal)
		).toEqual({ status: 503 });
		expect(limiter.reward).toHaveBeenCalledExactlyOnceWith("u1", limit, type);
		expect(limiter.penalty).not.toHaveBeenCalled();
	});

	it("refunds the full reservation once and rethrows unexpected geometry errors", async () => {
		const error = new TypeError("Invalid permission geometry");
		vi.mocked(checkFeaturesInBoundsServer).mockRejectedValueOnce(error);
		await expect(resolveTypeRequest(type, locals, "u1", limit, bounds, {})).rejects.toBe(error);
		expect(limiter.reward).toHaveBeenCalledExactlyOnceWith("u1", limit, type);
		expect(limiter.consume).not.toHaveBeenCalled();
		expect(limiter.penalty).not.toHaveBeenCalled();
	});

	it("returns 401 and refunds when nothing in bounds is permitted", async () => {
		const noArea = {
			user: { id: "u1" },
			perms: { everywhere: [], areas: [] }
		} as unknown as App.Locals;
		expect(await resolveTypeRequest(type, noArea, "u1", limit, bounds, {})).toEqual({
			status: 401
		});
		expect(limiter.reward).toHaveBeenCalledExactlyOnceWith("u1", limit - 100, type);
		expect(limiter.penalty).not.toHaveBeenCalled();
	});

	it("returns 400 and refunds on a malformed filter hash", async () => {
		expect(
			await resolveTypeRequest(type, locals, "u1", limit, bounds, { filterHash: "nope" })
		).toEqual({
			status: 400
		});
		expect(limiter.reward).toHaveBeenCalledTimes(1);
	});

	it("remembers a filter sent with its hash and reports it cached", async () => {
		const hash = getFilterHash(filter)!;
		const out = await resolveTypeRequest(type, locals, "u1", limit, bounds, {
			filter,
			filterHash: hash
		});
		expect(out).toMatchObject({ status: 200, filter, filterCached: "1" });
	});

	it("reports a mismatched hash as not cached", async () => {
		const out = await resolveTypeRequest(type, locals, "u1", limit, bounds, {
			filter,
			filterHash: "a".repeat(64)
		});
		expect(out).toMatchObject({ status: 200, filterCached: "0" });
	});

	it("recalls a known hash and returns 409 with a refund for an unknown one", async () => {
		const known = {
			category: "gym",
			enabled: true,
			filters: [{ id: "k" }]
		} as unknown as AnyFilter;
		const hash = getFilterHash(known)!;
		rememberFilter(hash, known);
		const hit = await resolveTypeRequest(type, locals, "u1", limit, bounds, { filterHash: hash });
		expect(hit).toMatchObject({ status: 200, filter: known });

		const miss = await resolveTypeRequest(type, locals, "u1", limit, bounds, {
			filterHash: "b".repeat(64)
		});
		expect(miss).toEqual({ status: 409 });
		expect(limiter.reward).toHaveBeenCalledWith("u1", limit - 100, type);
	});
});

describe("settleTypeRequest", () => {
	it("rewards the unused part of the request limit", async () => {
		const out = await settleTypeRequest(type, "u1", limit, undefined, { examined: 10, data: [] });
		expect(out.charge).toBeGreaterThan(0);
		expect(out.charge).toBeLessThan(limit);
		expect(limiter.reward).toHaveBeenCalledWith("u1", limit - out.charge, type);
		expect(out.remainingPoints).toBe(7);
	});

	it("caps the charged amount at the type's hard limit", async () => {
		const capped = await settleTypeRequest(type, "u1", limit, undefined, {
			examined: limit * 10,
			data: []
		});
		const atLimit = await settleTypeRequest(type, "u1", limit, undefined, {
			examined: limit,
			data: []
		});
		expect(capped.charge).toBe(atLimit.charge);
	});
});
