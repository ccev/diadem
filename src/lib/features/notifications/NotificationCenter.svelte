<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import {
		dismissNotification,
		getNotifications
	} from "@/lib/features/notifications/notifications.svelte";
	import { X } from "lucide-svelte";
	import { fly } from "svelte/transition";
</script>

{#if getNotifications().length > 0}
	<div
		class="pointer-events-none fixed right-3 top-3 z-[1000] flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-2 sm:right-4 sm:top-4"
	>
		{#each getNotifications() as notification (notification.id)}
			<article
				transition:fly={{ x: 24, duration: 120 }}
				class="bg-popover text-popover-foreground border-border pointer-events-auto overflow-hidden rounded-lg border shadow-lg"
			>
				<div class="flex items-start gap-3 p-4">
					<div class="bg-primary mt-1 size-2 shrink-0 rounded-full"></div>

					<div class="min-w-0 flex-1">
						<h2 class="text-sm font-semibold leading-tight">{notification.title}</h2>
						{#if notification.body}
							<p class="text-muted-foreground mt-1 text-sm leading-snug">{notification.body}</p>
						{/if}
						{#if notification.target?.label}
							<p class="text-muted-foreground mt-2 text-xs uppercase tracking-wide">
								{notification.target.label}
							</p>
						{/if}
					</div>

					<Button
						variant="ghost"
						size=""
						class="-mr-2 -mt-2 rounded-sm p-2"
						aria-label="Dismiss notification"
						onclick={() => dismissNotification(notification.id)}
					>
						<X class="size-4" />
					</Button>
				</div>
			</article>
		{/each}
	</div>
{/if}
