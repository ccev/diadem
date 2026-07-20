<script lang="ts">
	import { Drawer, type DrawerSnapPoint } from "$lib/drawer";

	let controlledOpen = $state(false);
	const snapPoints: DrawerSnapPoint[] = ["148px", 0.55, 1];
	let snapPoint = $state<DrawerSnapPoint | null>(snapPoints[0]);

	const button =
		"demo-button inline-flex h-9 items-center justify-center border border-neutral-950 bg-white px-3 text-sm font-medium text-neutral-950 select-none hover:bg-neutral-100 active:bg-neutral-200 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 dark:border-white dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-800";
	const viewport = "demo-viewport";
	const popup = "demo-popup demo-popup-bottom";
	const interactiveDrawer = { modal: false as const, disablePointerDismissal: true };
</script>

<svelte:head><title>Base UI Drawer Svelte port</title></svelte:head>

<Drawer.Provider>
	<main class="mx-auto min-h-dvh max-w-6xl px-5 py-12 sm:px-8">
		<header class="mb-12 max-w-3xl">
			<p class="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
				Svelte port lab
			</p>
			<h1 class="mb-4 text-4xl font-semibold tracking-tight sm:text-6xl">Base UI Drawer</h1>
			<p class="text-lg leading-8 text-neutral-600 dark:text-neutral-400">
				Native Svelte primitives with Base UI's anatomy, swipe directions, snap points, nested
				stacking, focus management, edge opening, background indentation, and virtual-keyboard
				handling.
			</p>
		</header>

		<div
			class="grid gap-px border border-neutral-300 bg-neutral-300 sm:grid-cols-2 lg:grid-cols-3 dark:border-neutral-700 dark:bg-neutral-700"
		>
			<section class="demo-card">
				<p class="demo-kicker">Default</p>
				<h2>Bottom sheet</h2>
				<p>Drag the handle or sheet downward, click outside, press Escape, or use Close.</p>
				<Drawer.Root {...interactiveDrawer}>
					<Drawer.Trigger class={button}>Open bottom drawer</Drawer.Trigger>
					<Drawer.Portal>
						<Drawer.Viewport class={viewport}>
							<Drawer.Popup class={popup}>
								<div class="demo-handle"></div>
								<Drawer.Content class="demo-content">
									<Drawer.Title class="demo-title">Notifications</Drawer.Title>
									<Drawer.Description class="demo-description">
										You are all caught up. Swipe down to dismiss this drawer.
									</Drawer.Description>
									<div class="demo-actions">
										<Drawer.Close class={button}>Close</Drawer.Close>
									</div>
								</Drawer.Content>
							</Drawer.Popup>
						</Drawer.Viewport>
					</Drawer.Portal>
				</Drawer.Root>
			</section>

			<section class="demo-card">
				<p class="demo-kicker">State</p>
				<h2>Controlled drawer</h2>
				<p>
					The parent owns <code>open</code>. Current state:
					<strong>{controlledOpen ? "open" : "closed"}</strong>.
				</p>
				<Drawer.Root {...interactiveDrawer} bind:open={controlledOpen}>
					<Drawer.Trigger class={button}>Toggle controlled drawer</Drawer.Trigger>
					<Drawer.Portal>
						<Drawer.Viewport class={viewport}>
							<Drawer.Popup class={popup}>
								<div class="demo-handle"></div>
								<Drawer.Content class="demo-content">
									<Drawer.Title class="demo-title">Controlled state</Drawer.Title>
									<Drawer.Description class="demo-description"
										>The same gestures emit state changes through a Svelte binding.</Drawer.Description
									>
									<div class="demo-actions">
										<Drawer.Close class={button}>Close</Drawer.Close>
									</div>
								</Drawer.Content>
							</Drawer.Popup>
						</Drawer.Viewport>
					</Drawer.Portal>
				</Drawer.Root>
			</section>

			<section class="demo-card">
				<p class="demo-kicker">Snap points</p>
				<h2>Three heights</h2>
				<p>
					Active point: <code>{String(snapPoint)}</code>. On touch devices, drag anywhere in the
					sheet to expand it before its contents begin scrolling.
				</p>
				<Drawer.Root {...interactiveDrawer} {snapPoints} bind:snapPoint>
					<Drawer.Trigger class={button}>Open snapping drawer</Drawer.Trigger>
					<Drawer.Portal>
						<Drawer.Viewport class={viewport}>
							<Drawer.Popup class="{popup} demo-snap-popup">
								<div class="demo-handle"></div>
								<Drawer.Content class="demo-content">
									<Drawer.Title class="demo-title">Explore snap points</Drawer.Title>
									<Drawer.Description class="demo-description"
										>148px, 55% of the viewport, and fully expanded.</Drawer.Description
									>
									<div class="space-y-3">
										{#each Array(12) as _, index}<div class="demo-row">
												Result {index + 1}
											</div>{/each}
									</div>
								</Drawer.Content>
							</Drawer.Popup>
						</Drawer.Viewport>
					</Drawer.Portal>
				</Drawer.Root>
			</section>

			<section class="demo-card">
				<p class="demo-kicker">Form controls</p>
				<h2>Text input</h2>
				<p>
					A focused text field remains interactive and does not accidentally begin a mouse drag.
				</p>
				<Drawer.Root {...interactiveDrawer}>
					<Drawer.Trigger class={button}>Open text input drawer</Drawer.Trigger>
					<Drawer.Portal>
						<Drawer.VirtualKeyboardProvider>
							<Drawer.Viewport class={viewport}>
								<Drawer.Popup class="{popup} demo-keyboard-popup">
									<div class="demo-handle"></div>
									<Drawer.Content class="demo-content">
										<Drawer.Title class="demo-title">Create a profile</Drawer.Title>
										<Drawer.Description class="demo-description">
											Enter a display name, then try dragging from the surrounding content.
										</Drawer.Description>
										<label class="demo-field">
											Display name
											<input placeholder="Trainer name" autocomplete="name" />
										</label>
										<div class="demo-actions">
											<Drawer.Close class={button}>Save</Drawer.Close>
										</div>
									</Drawer.Content>
								</Drawer.Popup>
							</Drawer.Viewport>
						</Drawer.VirtualKeyboardProvider>
					</Drawer.Portal>
				</Drawer.Root>
			</section>

			{#each [{ direction: "right" as const, label: "Right side", popupClass: "demo-popup-right" }, { direction: "left" as const, label: "Left side", popupClass: "demo-popup-left" }, { direction: "up" as const, label: "Top edge", popupClass: "demo-popup-top" }] as example}
				<section class="demo-card">
					<p class="demo-kicker">Direction</p>
					<h2>{example.label}</h2>
					<p>Position comes from CSS; <code>swipeDirection</code> controls dismissal physics.</p>
					<Drawer.Root {...interactiveDrawer} swipeDirection={example.direction}>
						<Drawer.Trigger class={button}>Open {example.label.toLowerCase()}</Drawer.Trigger>
						<Drawer.Portal>
							<Drawer.Viewport class="{viewport} demo-viewport-{example.direction}">
								<Drawer.Popup class="demo-popup {example.popupClass}">
									<Drawer.Content class="demo-content">
										<Drawer.Title class="demo-title">{example.label} drawer</Drawer.Title>
										<Drawer.Description class="demo-description"
											>Swipe {example.direction} to dismiss.</Drawer.Description
										>
										<div class="demo-actions">
											<Drawer.Close class={button}>Close</Drawer.Close>
										</div>
									</Drawer.Content>
								</Drawer.Popup>
							</Drawer.Viewport>
						</Drawer.Portal>
					</Drawer.Root>
				</section>
			{/each}

			<section class="demo-card sm:col-span-2 lg:col-span-3">
				<p class="demo-kicker">Nested drawers</p>
				<h2>Variable-height drawer stack</h2>
				<p>
					Open Security, then Advanced. Parent drawers expose nested state and coordinated
					height/progress variables.
				</p>
				<Drawer.Root {...interactiveDrawer}>
					<Drawer.Trigger class={button}>Open drawer stack</Drawer.Trigger>
					<Drawer.Portal>
						<Drawer.Viewport class={viewport}>
							<Drawer.Popup class="{popup} demo-stack-popup">
								<div class="demo-handle"></div>
								<Drawer.Content class="demo-stack-content">
									<Drawer.Title class="demo-title">Account</Drawer.Title>
									<Drawer.Description class="demo-description"
										>Each layer is independently focus-managed.</Drawer.Description
									>
									<div class="demo-actions">
										<Drawer.Root {...interactiveDrawer}>
											<Drawer.Trigger class={button}>Security settings</Drawer.Trigger>
											<Drawer.Portal>
												<Drawer.Viewport class={viewport}>
													<Drawer.Popup class="{popup} demo-stack-popup">
														<div class="demo-handle"></div>
														<Drawer.Content class="demo-stack-content">
															<Drawer.Title class="demo-title">Security</Drawer.Title>
															<Drawer.Description class="demo-description"
																>Passkeys enabled. Two-factor authentication is active.</Drawer.Description
															>
															<div class="demo-actions">
																<Drawer.Root {...interactiveDrawer}>
																	<Drawer.Trigger class={button}>Advanced</Drawer.Trigger>
																	<Drawer.Portal>
																		<Drawer.Viewport class={viewport}>
																			<Drawer.Popup class="{popup} demo-stack-popup">
																				<div class="demo-handle"></div>
																				<Drawer.Content class="demo-stack-content">
																					<Drawer.Title class="demo-title">Advanced</Drawer.Title>
																					<Drawer.Description class="demo-description"
																						>A taller nested form.</Drawer.Description
																					>
																					<label class="demo-field"
																						>Device name<input value="Personal laptop" /></label
																					>
																					<label class="demo-field"
																						>Notes<textarea rows="4"
																							>Rotate recovery codes and revoke older sessions.</textarea
																						></label
																					>
																					<div class="demo-actions">
																						<Drawer.Close class={button}>Done</Drawer.Close>
																					</div>
																				</Drawer.Content>
																			</Drawer.Popup>
																		</Drawer.Viewport>
																	</Drawer.Portal>
																</Drawer.Root>
																<Drawer.Close class={button}>Close</Drawer.Close>
															</div>
														</Drawer.Content>
													</Drawer.Popup>
												</Drawer.Viewport>
											</Drawer.Portal>
										</Drawer.Root>
										<Drawer.Close class={button}>Close</Drawer.Close>
									</div>
								</Drawer.Content>
							</Drawer.Popup>
						</Drawer.Viewport>
					</Drawer.Portal>
				</Drawer.Root>
			</section>

			<section class="demo-card">
				<p class="demo-kicker">Virtual keyboard</p>
				<h2>Mobile form</h2>
				<p>Uses Visual Viewport to expose keyboard inset and keep focused fields visible.</p>
				<Drawer.Root {...interactiveDrawer}>
					<Drawer.Trigger class={button}>Open keyboard demo</Drawer.Trigger>
					<Drawer.Portal>
						<Drawer.VirtualKeyboardProvider>
							<Drawer.Viewport class={viewport}>
								<Drawer.Popup class="{popup} demo-keyboard-popup">
									<div class="demo-handle"></div>
									<Drawer.Content class="demo-content">
										<Drawer.Title class="demo-title">Edit profile</Drawer.Title>
										<Drawer.Description class="demo-description"
											>Try this on a phone with the software keyboard.</Drawer.Description
										>
										<label class="demo-field"
											>Display name<input placeholder="Trainer name" /></label
										>
										<label class="demo-field"
											>Biography<textarea rows="5" placeholder="A few words about you"
											></textarea></label
										>
										<div class="demo-actions">
											<Drawer.Close class={button}>Save</Drawer.Close>
										</div>
									</Drawer.Content>
								</Drawer.Popup>
							</Drawer.Viewport>
						</Drawer.VirtualKeyboardProvider>
					</Drawer.Portal>
				</Drawer.Root>
			</section>

			<section class="demo-card sm:col-span-2">
				<p class="demo-kicker">Swipe to open</p>
				<h2>Left-edge gesture</h2>
				<p>
					Drag inward from the striped rail fixed to the left edge. It is intentionally visible on
					this lab page.
				</p>
				<Drawer.Root {...interactiveDrawer} swipeDirection="left">
					<Drawer.Trigger class={button}>Or open with button</Drawer.Trigger>
					<Drawer.SwipeArea class="demo-swipe-area" swipeDirection="right"
						><span>Swipe</span></Drawer.SwipeArea
					>
					<Drawer.Portal>
						<Drawer.Viewport class="{viewport} demo-viewport-left">
							<Drawer.Popup class="demo-popup demo-popup-left">
								<Drawer.Content class="demo-content">
									<Drawer.Title class="demo-title">Opened from the edge</Drawer.Title>
									<Drawer.Description class="demo-description"
										>Swipe left to put it away.</Drawer.Description
									>
									<div class="demo-actions">
										<Drawer.Close class={button}>Close</Drawer.Close>
									</div>
								</Drawer.Content>
							</Drawer.Popup>
						</Drawer.Viewport>
					</Drawer.Portal>
				</Drawer.Root>
			</section>
		</div>
	</main>
</Drawer.Provider>

<style>
	.demo-card {
		display: flex;
		min-height: 18rem;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.85rem;
		background: var(--background);
		padding: 1.5rem;
	}
	.demo-card h2 {
		font-size: 1.35rem;
		font-weight: 650;
		letter-spacing: -0.02em;
	}
	.demo-card p:not(.demo-kicker) {
		max-width: 38rem;
		color: #737373;
		line-height: 1.55;
	}
	:global(.dark) .demo-card p:not(.demo-kicker) {
		color: #a3a3a3;
	}
	.demo-card :global(.demo-button) {
		margin-top: auto;
	}
	.demo-kicker {
		font-family: monospace;
		font-size: 0.7rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #737373;
	}
	:global(.demo-viewport) {
		position: fixed;
		inset: 0;
		z-index: 61;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		pointer-events: none;
	}
	:global(.demo-viewport > *) {
		pointer-events: auto;
	}
	:global(.demo-popup) {
		box-sizing: border-box;
		background: var(--background);
		color: var(--foreground);
		outline: 0;
		box-shadow: 0 -1.5rem 4rem rgb(0 0 0 / 0.15);
		overflow-y: auto;
		overscroll-behavior: contain;
		touch-action: auto;
		will-change: transform;
		transition:
			transform 450ms cubic-bezier(0.32, 0.72, 0, 1),
			height 450ms cubic-bezier(0.32, 0.72, 0, 1),
			opacity 450ms;
	}
	:global(.demo-popup[data-swiping]),
	:global(.demo-popup[data-nested-drawer-swiping]) {
		transition-duration: 0ms;
		user-select: none;
	}
	:global(.demo-popup[data-ending-style]) {
		transition-duration: calc(var(--drawer-swipe-strength) * 400ms);
	}
	:global(.demo-popup-bottom) {
		width: 100%;
		max-height: calc(82dvh + 3rem);
		margin-bottom: -3rem;
		border-top: 1px solid #737373;
		padding: 1rem 1.5rem calc(4.5rem + env(safe-area-inset-bottom));
		transform: translateY(calc(var(--drawer-snap-point-offset) + var(--drawer-swipe-movement-y)));
	}
	:global(.demo-popup-bottom[data-starting-style]),
	:global(.demo-popup-bottom[data-ending-style]) {
		transform: translateY(calc(100% - 3rem + 2px)) !important;
	}
	:global(.demo-snap-popup) {
		height: calc(100dvh + 3rem);
		max-height: none;
	}
	:global(.demo-viewport-right) {
		align-items: stretch;
		justify-content: flex-end;
	}
	:global(.demo-viewport-left) {
		align-items: stretch;
		justify-content: flex-start;
	}
	:global(.demo-viewport-up) {
		align-items: flex-start;
	}
	:global(.demo-popup-right),
	:global(.demo-popup-left) {
		width: min(22rem, calc(100vw - 3rem));
		height: 100%;
		padding: 2rem;
		transform: translateX(var(--drawer-swipe-movement-x));
	}
	:global(.demo-popup-right) {
		border-left: 1px solid #737373;
	}
	:global(.demo-popup-left) {
		border-right: 1px solid #737373;
	}
	:global(.demo-popup-right[data-starting-style]),
	:global(.demo-popup-right[data-ending-style]) {
		transform: translateX(calc(100% + 2px)) !important;
	}
	:global(.demo-popup-left[data-starting-style]),
	:global(.demo-popup-left[data-ending-style]) {
		transform: translateX(calc(-100% - 2px)) !important;
	}
	:global(.demo-popup-top) {
		width: 100%;
		max-height: 75dvh;
		border-bottom: 1px solid #737373;
		padding: calc(2rem + env(safe-area-inset-top)) 2rem 2rem;
		transform: translateY(var(--drawer-swipe-movement-y));
	}
	:global(.demo-popup-top[data-starting-style]),
	:global(.demo-popup-top[data-ending-style]) {
		transform: translateY(calc(-100% - 2px));
	}
	:global(.demo-content),
	:global(.demo-stack-content) {
		width: 100%;
		max-width: 32rem;
		margin: 0 auto;
	}
	:global(.demo-title) {
		margin-bottom: 0.3rem;
		font-size: 1.15rem;
		font-weight: 700;
		text-align: center;
	}
	:global(.demo-description) {
		margin-bottom: 1.5rem;
		color: #737373;
		text-align: center;
	}
	:global(.demo-actions) {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
	}
	:global(.demo-actions .demo-button) {
		margin-top: 0;
	}
	:global(.demo-handle) {
		width: 3rem;
		height: 0.25rem;
		margin: 0 auto 1rem;
		background: #d4d4d4;
	}
	:global(.dark .demo-handle) {
		background: #525252;
	}
	:global(.demo-row) {
		border-top: 1px solid #d4d4d4;
		padding: 0.75rem 0;
	}
	:global(.dark .demo-row) {
		border-color: #404040;
	}
	:global(.demo-stack-popup) {
		--bleed: 3rem;
		--peek: 1rem;
		--stack-progress: clamp(0, var(--drawer-swipe-progress), 1);
		--stack-step: 0.05;
		--stack-peek-offset: max(
			0px,
			calc((var(--nested-drawers) - var(--stack-progress)) * var(--peek))
		);
		--stack-scale-base: max(0, calc(1 - var(--nested-drawers) * var(--stack-step)));
		--stack-scale: calc(var(--stack-scale-base) + var(--stack-step) * var(--stack-progress));
		--stack-shrink: calc(1 - var(--stack-scale));
		--stack-height: max(
			0px,
			calc(var(--drawer-frontmost-height, var(--drawer-height)) - var(--bleed))
		);
		--translate-y: calc(
			var(--drawer-swipe-movement-y) - var(--stack-peek-offset) - var(--stack-shrink) *
				var(--stack-height)
		);
		position: relative;
		width: calc(100% + 2px);
		max-height: calc(82dvh + var(--bleed));
		height: var(--drawer-height, auto);
		margin: 0 -1px calc(-1 * var(--bleed));
		border: 1px solid #737373;
		border-bottom: 0;
		padding: 1rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom) + var(--bleed));
		transform-origin: 50% calc(100% - var(--bleed));
		transform: translateY(var(--translate-y)) scale(var(--stack-scale));
	}
	:global(.demo-stack-popup[data-starting-style]),
	:global(.demo-stack-popup[data-ending-style]) {
		transform: translateY(calc(100% - var(--bleed) + 2px));
	}
	:global(.demo-stack-popup[data-nested-drawer-open]) {
		height: calc(var(--stack-height) + var(--bleed));
		overflow: hidden;
	}
	:global(.demo-stack-popup[data-nested-drawer-open]::after) {
		position: absolute;
		inset: 0;
		background: rgb(0 0 0 / 0.05);
		content: "";
		pointer-events: none;
	}
	:global(.demo-stack-popup[data-nested-drawer-open] > .demo-stack-content) {
		opacity: 0;
	}
	:global(.demo-stack-popup[data-nested-drawer-swiping] > .demo-stack-content) {
		opacity: 1;
	}
	:global(.demo-stack-content) {
		transition: opacity 150ms;
	}
	:global(.demo-field) {
		display: grid;
		gap: 0.45rem;
		margin-bottom: 1rem;
		font-size: 0.85rem;
		font-weight: 650;
	}
	:global(.demo-field input),
	:global(.demo-field textarea) {
		width: 100%;
		border: 1px solid #737373;
		background: var(--background);
		padding: 0.65rem;
		font: inherit;
		font-weight: 400;
		outline-offset: -2px;
	}
	:global(.demo-keyboard-popup) {
		max-height: calc(90dvh - var(--drawer-keyboard-inset) + 3rem);
	}
	:global(.demo-swipe-area) {
		position: fixed;
		z-index: 70;
		inset: 25% auto 25% 0;
		display: grid;
		width: 1.25rem;
		place-items: center;
		border: 1px dashed #737373;
		border-left: 0;
		background: repeating-linear-gradient(-45deg, #fff, #fff 4px, #d4d4d4 4px, #d4d4d4 8px);
		color: #171717;
	}
	:global(.demo-swipe-area span) {
		writing-mode: vertical-rl;
		font: 10px monospace;
		text-transform: uppercase;
		letter-spacing: 0.15em;
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.demo-popup) {
			transition-duration: 1ms !important;
		}
	}
</style>
