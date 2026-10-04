<script lang="ts">
	import { DropdownMenu } from "bits-ui";
	import { closeQuickActions, getQuickActions } from "@/lib/ui/quickActions.svelte";

	const menu = $derived(getQuickActions());
	const anchor = $derived({
		getBoundingClientRect: () => new DOMRect(menu?.x ?? 0, menu?.y ?? 0, 0, 0)
	});
</script>

<svelte:window onpopstate={closeQuickActions} onblur={closeQuickActions} />

<DropdownMenu.Root bind:open={() => !!menu, (open) => !open && closeQuickActions()}>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			customAnchor={anchor}
			side="bottom"
			align="start"
			sideOffset={4}
			collisionPadding={8}
			class="z-100 border-border w-60 max-w-[calc(100vw-1rem)] max-h-[var(--bits-dropdown-menu-content-available-height)] overflow-y-auto border bg-card text-card-foreground shadow-popover outline-hidden rounded-lg p-1.5"
			onCloseAutoFocus={(event) => event.preventDefault()}
			onEscapeKeydown={(event) => {
				event.preventDefault();
				event.stopImmediatePropagation();
				const trigger = menu?.trigger;
				closeQuickActions();
				trigger?.focus({ preventScroll: true });
			}}
		>
			{#if menu}
				<DropdownMenu.Group>
					<DropdownMenu.GroupHeading
						class="px-3 py-2 text-xs font-semibold text-muted-foreground truncate"
					>
						{menu.title}
					</DropdownMenu.GroupHeading>
					{#each menu.getActions() as action}
						<DropdownMenu.Item
							disabled={action.disabled}
							onSelect={() => {
								const trigger = menu?.trigger;
								closeQuickActions();
								trigger?.focus({ preventScroll: true });
								action.onclick?.();
							}}
						>
							{#snippet child({ props })}
								<svelte:element
									this={action.href ? "a" : "div"}
									{...props}
									href={action.href}
									target={action.href ? "_blank" : undefined}
									rel={action.href ? "noopener noreferrer" : undefined}
									class="data-highlighted:bg-muted data-disabled:opacity-40 data-disabled:pointer-events-none cursor-pointer rounded-md px-3 min-h-10 flex font-medium text-sm items-center gap-2 outline-hidden"
									class:text-destructive={action.destructive}
								>
									<action.Icon class="size-4 shrink-0" />
									{action.label}
								</svelte:element>
							{/snippet}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Group>
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
