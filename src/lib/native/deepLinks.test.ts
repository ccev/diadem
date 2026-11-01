import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	completeLogin: vi.fn(),
	toast: vi.fn(),
	goto: vi.fn(),
	replace: vi.fn(),
	reload: vi.fn(),
	addListener: vi.fn(),
	getLaunchUrl: vi.fn()
}));
vi.mock("@/lib/native/runtime", () => ({ isNative: () => true }));
vi.mock("@/lib/native/auth", () => ({ completeNativeLogin: mocks.completeLogin }));
vi.mock("@/lib/ui/toasts.svelte", () => ({ openToast: mocks.toast }));
vi.mock("@/lib/paraglide/messages", () => ({ m: { signin_toast_error: () => "Sign-in failed" } }));
vi.mock("$app/navigation", () => ({ goto: mocks.goto }));
vi.mock("@capacitor/app", () => ({
	App: { addListener: mocks.addListener, getLaunchUrl: mocks.getLaunchUrl }
}));

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	mocks.completeLogin.mockResolvedValue(true);
	mocks.getLaunchUrl.mockResolvedValue(undefined);
	mocks.addListener.mockResolvedValue({ remove: vi.fn() });
	const session = new Map<string, string>();
	vi.stubGlobal("sessionStorage", {
		getItem: (key: string) => session.get(key) ?? null,
		setItem: (key: string, value: string) => session.set(key, value)
	});
	vi.stubGlobal("window", {
		location: { origin: "https://localhost", replace: mocks.replace, reload: mocks.reload }
	});
});
afterEach(() => vi.unstubAllGlobals());

describe("native deep links", () => {
	it("returns to the original route after auth and skips the consumed Android launch URL on reload", async () => {
		const url = "diadem://auth?code=code&redir=%2Fa%3Flat%3D1%23map";
		await (await import("./deepLinks")).handleDeepLink(url);
		expect(mocks.replace).toHaveBeenCalledWith("/a?lat=1#map");
		vi.resetModules();
		await (await import("./deepLinks")).handleDeepLink(url);
		expect(mocks.completeLogin).toHaveBeenCalledOnce();
	});

	it("reloads locally rather than following an external auth return path", async () => {
		await (
			await import("./deepLinks")
		).handleDeepLink("diadem://auth?code=code&redir=https://other.example");
		expect(mocks.replace).not.toHaveBeenCalled();
		expect(mocks.reload).toHaveBeenCalledOnce();
	});

	it("makes server and exchange failures visible", async () => {
		const { handleDeepLink } = await import("./deepLinks");
		await handleDeepLink("diadem://auth?error=1");
		mocks.completeLogin.mockResolvedValue(false);
		await handleDeepLink("diadem://auth?code=failed");
		expect(mocks.toast).toHaveBeenCalledTimes(2);
		expect(mocks.toast).toHaveBeenCalledWith("Sign-in failed", 10000);
		expect(mocks.reload).not.toHaveBeenCalled();
	});

	it("preserves query and hash on content links", async () => {
		const { handleDeepLink, markNativeNavigationReady } = await import("./deepLinks");
		markNativeNavigationReady(true);
		await handleDeepLink("diadem://coverage?lat=1&lon=2#map");
		expect(mocks.goto).toHaveBeenCalledWith("/coverage?lat=1&lon=2#map");
	});

	it("queues cold-start content navigation until the router and configuration are ready", async () => {
		const { handleDeepLink, markNativeNavigationReady } = await import("./deepLinks");
		const opening = handleDeepLink("diadem://coverage");
		await Promise.resolve();
		expect(mocks.goto).not.toHaveBeenCalled();
		markNativeNavigationReady(true);
		await opening;
		expect(mocks.goto).toHaveBeenCalledWith("/coverage");
	});

	it("skips content navigation when the instance gate or connection error is shown", async () => {
		const { handleDeepLink, markNativeNavigationReady } = await import("./deepLinks");
		const opening = handleDeepLink("diadem://coverage");
		markNativeNavigationReady(false);
		await opening;
		expect(mocks.goto).not.toHaveBeenCalled();
	});

	it("installs the OS listener once", async () => {
		const { installDeepLinks } = await import("./deepLinks");
		await installDeepLinks();
		await installDeepLinks();
		expect(mocks.addListener).toHaveBeenCalledOnce();
		expect(mocks.getLaunchUrl).toHaveBeenCalledOnce();
	});
});
