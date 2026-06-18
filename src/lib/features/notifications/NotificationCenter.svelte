<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import {
		dismissNotification,
		getNotifications,
		sendNotification,
		type AppNotification
	} from "@/lib/features/notifications/notifications.svelte";
	import { goto } from "$app/navigation";
	import { MapPin, X } from "lucide-svelte";
	import { fly } from "svelte/transition";

	// Accent colour per object kind, mirroring how the map distinguishes them.
	const accents: Record<string, string> = {
		pokemon: "var(--primary)",
		raid: "#ef4444",
		quest: "#3b82f6",
		invasion: "#a855f7",
		maxBattle: "#f97316"
	};

	function accentFor(kind: string | undefined): string {
		return (kind && accents[kind]) || "var(--primary)";
	}

	function openNotification(notification: AppNotification) {
		if (!notification.url) return;
		try {
			const target = new URL(notification.url, location.origin);
			if (target.origin === location.origin) {
				goto(target.pathname + target.search);
			} else {
				location.href = notification.url;
			}
		} catch {
			// ignore malformed urls
		}
		dismissNotification(notification.id);
	}

	// Foreground pushes are forwarded by the service worker as messages so we can
	// render the nicer in-app toast instead of an OS notification.
	$effect(() => {
		if (!("serviceWorker" in navigator)) return;

		function onMessage(event: MessageEvent) {
			if (event.data?.type !== "push-notification") return;
			const p = event.data.payload ?? {};
			sendNotification({
				title: p.title ?? "Notification",
				body: p.body,
				icon: p.icon,
				address: p.address,
				kind: p.kind,
				url: p.url,
				timeoutMs: 8000
			});
		}

		navigator.serviceWorker.addEventListener("message", onMessage);
		return () => navigator.serviceWorker.removeEventListener("message", onMessage);
	});
</script>

{#if getNotifications().length > 0}
	<div
		class="pointer-events-none fixed right-3 top-3 z-[1000] flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-2 sm:right-4 sm:top-4"
	>
		{#each getNotifications() as notification (notification.id)}
			<article
				transition:fly={{ x: 24, duration: 120 }}
				class="bg-popover text-popover-foreground border-border pointer-events-auto flex overflow-hidden rounded-lg border shadow-lg"
			>
				<div class="w-1 shrink-0" style="background-color: {accentFor(notification.kind)}"></div>

				<button
					type="button"
					class="flex flex-1 items-start gap-3 p-3 text-left {notification.url
						? 'hover:bg-muted/50 cursor-pointer'
						: 'cursor-default'}"
					onclick={() => openNotification(notification)}
				>
					{#if notification.icon}
						<img
							src={notification.icon}
							alt=""
							class="bg-muted/40 size-12 shrink-0 rounded-md object-contain"
							loading="lazy"
						/>
					{:else}
						<div
							class="mt-1 size-2 shrink-0 rounded-full"
							style="background-color: {accentFor(notification.kind)}"
						></div>
					{/if}

					<div class="min-w-0 flex-1">
						<h2 class="truncate text-sm font-semibold leading-tight">{notification.title}</h2>
						{#if notification.body}
							<p class="text-muted-foreground mt-0.5 whitespace-pre-line text-sm leading-snug">
								{notification.body}
							</p>
						{/if}
						{#if notification.address}
							<p class="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
								<MapPin class="size-3 shrink-0" />
								<span class="truncate">{notification.address}</span>
							</p>
						{/if}
					</div>
				</button>

				<Button
					variant="ghost"
					size=""
					class="m-1 shrink-0 self-start rounded-sm p-2"
					aria-label="Dismiss notification"
					onclick={() => dismissNotification(notification.id)}
				>
					<X class="size-4" />
				</Button>
			</article>
		{/each}
	</div>
{/if}
