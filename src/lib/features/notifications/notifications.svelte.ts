import { browser } from "$app/environment";

export type NotificationTarget = {
	type: string;
	id?: string | number;
	label?: string;
};

export type NotificationInput = {
	title: string;
	body?: string;
	target?: NotificationTarget;
	data?: Record<string, unknown>;
	native?: boolean;
	timeoutMs?: number;
};

export type AppNotification = Required<Pick<NotificationInput, "title">> &
	Omit<NotificationInput, "title"> & {
		id: string;
		createdAt: number;
	};

export type NotificationPermissionState = NotificationPermission | "unsupported";

const maxNotifications = 5;
const defaultTimeoutMs = 5000;

let notifications: AppNotification[] = $state([]);
let notificationPermission: NotificationPermissionState = $state(getInitialPermission());
const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

function getInitialPermission(): NotificationPermissionState {
	if (!browser || !("Notification" in window)) return "unsupported";
	return Notification.permission;
}

function createNotificationId() {
	if (browser && crypto.randomUUID) return crypto.randomUUID();
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function showNativeNotification(notification: AppNotification) {
	if (!browser || !("Notification" in window) || Notification.permission !== "granted") return;

	const options: NotificationOptions = {
		body: notification.body,
		tag: notification.target
			? `${notification.target.type}:${notification.target.id ?? "new"}`
			: undefined
	};

	// Android (and most mobile browsers) do not support the `new Notification()`
	// constructor — it throws "Illegal constructor". System notifications there
	// must be shown via the service worker registration. Prefer the service
	// worker everywhere and fall back to the constructor on desktop.
	if ("serviceWorker" in navigator) {
		try {
			const registration = await navigator.serviceWorker.ready;
			await registration.showNotification(notification.title, options);
			return;
		} catch {
			// fall through to the constructor below
		}
	}

	try {
		new Notification(notification.title, options);
	} catch {
		// constructor unavailable (e.g. Android) and the service worker path failed
	}
}

export function getNotifications() {
	return notifications;
}

export function getNotificationPermission() {
	return notificationPermission;
}

export async function requestNotificationPermission() {
	if (!browser || !("Notification" in window)) {
		notificationPermission = "unsupported";
		return notificationPermission;
	}

	notificationPermission = await Notification.requestPermission();
	return notificationPermission;
}

export function sendNotification(input: NotificationInput) {
	const notification: AppNotification = {
		...input,
		id: createNotificationId(),
		createdAt: Date.now()
	};

	notifications.unshift(notification);
	notifications.splice(maxNotifications);

	if (input.native) void showNativeNotification(notification);

	const timeoutMs = input.timeoutMs ?? defaultTimeoutMs;
	if (timeoutMs > 0) {
		const timeout = setTimeout(() => dismissNotification(notification.id), timeoutMs);
		timeouts.set(notification.id, timeout);
	}

	return notification;
}

export function dismissNotification(id: string) {
	const timeout = timeouts.get(id);
	if (timeout) clearTimeout(timeout);
	timeouts.delete(id);

	const index = notifications.findIndex((notification) => notification.id === id);
	if (index !== -1) notifications.splice(index, 1);
}

export function clearNotifications() {
	for (const timeout of timeouts.values()) clearTimeout(timeout);
	timeouts.clear();
	notifications = [];
}
