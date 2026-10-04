import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleDeepLink, installDeepLinks } from "@/lib/native/deepLinks";
import * as runtime from "@/lib/native/runtime";
import { clearStoredToken, completeNativeLogin } from "@/lib/native/auth";
import { App } from "@capacitor/app";

vi.mock("@/lib/native/runtime", () => ({
	isNative: vi.fn(() => true),
	isInstanceUrlBaked: vi.fn(() => false),
	getInstanceUrl: vi.fn(() => "https://old.example"),
	fetchInstanceMapName: vi.fn(async () => "New map"),
	setInstanceUrl: vi.fn(async () => {})
}));
vi.mock("@/lib/native/auth", () => ({
	clearStoredToken: vi.fn(async () => {}),
	completeNativeLogin: vi.fn(async () => true)
}));
const app = vi.hoisted(() => ({
	addListener: vi.fn<(eventName: string, listener: (event: { url: string }) => void) => void>()
}));
vi.mock("@capacitor/app", () => ({
	App: { addListener: app.addListener, getLaunchUrl: vi.fn() }
}));

const link = "diadem://instance?url=https%3A%2F%2Fnew.example";
const assign = vi.fn();
const reload = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal("window", { location: { assign, reload } });
	vi.mocked(runtime.isNative).mockReturnValue(true);
	vi.mocked(runtime.isInstanceUrlBaked).mockReturnValue(false);
	vi.mocked(runtime.getInstanceUrl).mockReturnValue("https://old.example");
	vi.mocked(runtime.fetchInstanceMapName).mockResolvedValue("New map");
});
afterEach(() => vi.unstubAllGlobals());

describe("instance deep links", () => {
	it("validates the instance and clears its predecessor's token before switching", async () => {
		await handleDeepLink(link);
		expect(runtime.fetchInstanceMapName).toHaveBeenCalledWith("https://new.example");
		expect(clearStoredToken).toHaveBeenCalledOnce();
		expect(vi.mocked(clearStoredToken).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(runtime.setInstanceUrl).mock.invocationCallOrder[0]
		);
		expect(runtime.setInstanceUrl).toHaveBeenCalledWith("https://new.example");
		expect(assign).toHaveBeenCalledWith("/");
	});

	it.each([
		"javascript:alert(1)",
		"file:///tmp/map",
		"https://user:pass@new.example",
		"https://new.example/path",
		"https://new.example?secret=1",
		"https://new.example#hash",
		"invalid",
		""
	])("ignores invalid instance URL %s", async (url) => {
		await handleDeepLink(`diadem://instance?url=${encodeURIComponent(url)}`);
		expect(runtime.fetchInstanceMapName).not.toHaveBeenCalled();
		expect(runtime.setInstanceUrl).not.toHaveBeenCalled();
		expect(clearStoredToken).not.toHaveBeenCalled();
	});

	it("preserves the current connection and login", async () => {
		vi.mocked(runtime.getInstanceUrl).mockReturnValue("https://new.example");
		await handleDeepLink(link);
		expect(clearStoredToken).not.toHaveBeenCalled();
		expect(assign).not.toHaveBeenCalled();
	});
	it("does not switch an unreachable instance", async () => {
		vi.mocked(runtime.fetchInstanceMapName).mockResolvedValue(null);
		await handleDeepLink(link);
		expect(clearStoredToken).not.toHaveBeenCalled();
		expect(runtime.setInstanceUrl).not.toHaveBeenCalled();
	});
	it("preserves a branded app's configured instance", async () => {
		vi.mocked(runtime.isInstanceUrlBaked).mockReturnValue(true);
		await handleDeepLink(link);
		expect(runtime.fetchInstanceMapName).not.toHaveBeenCalled();
		expect(runtime.setInstanceUrl).not.toHaveBeenCalled();
	});
	it("does not configure a web client", async () => {
		vi.mocked(runtime.isNative).mockReturnValue(false);
		await handleDeepLink(link);
		expect(runtime.setInstanceUrl).not.toHaveBeenCalled();
	});
	it("handles a cold-start instance link", async () => {
		vi.mocked(App.getLaunchUrl).mockResolvedValue({ url: link });
		await installDeepLinks();
		await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
	});
	it("allows the same warm-start link again after disconnecting", async () => {
		vi.mocked(App.getLaunchUrl).mockResolvedValue(undefined);
		await installDeepLinks();
		const listener = app.addListener.mock.calls[0][1];
		listener({ url: link });
		await vi.waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
		listener({ url: link });
		await vi.waitFor(() => expect(assign).toHaveBeenCalledTimes(2));
	});

	it("deduplicates simultaneous OS delivery of the same link", async () => {
		vi.mocked(App.getLaunchUrl).mockResolvedValue(undefined);
		await installDeepLinks();
		const listener = app.addListener.mock.calls[0][1];
		listener({ url: link });
		listener({ url: link });
		await vi.waitFor(() => expect(assign).toHaveBeenCalledOnce());
		expect(runtime.setInstanceUrl).toHaveBeenCalledOnce();
	});

	it("still completes OAuth handoffs", async () => {
		await handleDeepLink("diadem://auth?code=one-time");
		expect(completeNativeLogin).toHaveBeenCalledWith("one-time");
		expect(reload).toHaveBeenCalledOnce();
	});
});
