<script lang="ts">
	import { untrack } from "svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import { ArrowRight, CircleCheck, CircleX, LoaderCircle } from "lucide-svelte";
	import { fetchInstanceMapName, setInstanceUrl } from "@/lib/native/runtime";
	import { clearStoredToken } from "@/lib/native/auth";
	import { fly } from "svelte/transition";
	import * as m from "@/lib/paraglide/messages";

	// makes sure this is loadable before anything else
	let { initial = "", onCancel }: { initial?: string; onCancel?: () => void } = $props();

	let value = $state(untrack(() => initial));

	let checking = $state(false);
	let connecting = $state(false);
	let mapName = $state<string | null>(null);
	let failed = $state(false);

	function resetConnectionState() {
		mapName = null;
		failed = false;
	}

	async function checkConnection() {
		if (checking || connecting) return;
		const target = value;
		failed = false;
		checking = true;

		let name = null;
		try {
			name = await fetchInstanceMapName(target);
		} catch {
			name = null;
		}

		if (target !== value) {
			checking = false;
			return;
		}

		checking = false;
		if (name === null) failed = true;
		else mapName = name;
	}

	async function connect() {
		if (connecting) return;
		connecting = true;
		failed = false;
		const name = mapName ?? (await fetchInstanceMapName(value));
		if (name === null) {
			connecting = false;
			failed = true;
			return;
		}
		mapName = name;
		await setInstanceUrl(value);
		await clearStoredToken();
		window.location.assign("/");
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === "Enter") connect();
	}

	const stars = [
		{ top: 14, left: 7, size: 2, dur: 3.1, delay: 0 },
		{ top: 22, left: 84, size: 3, dur: 4.2, delay: 0.5 },
		{ top: 58, left: 34, size: 2, dur: 3.6, delay: 1.2 },
		{ top: 40, left: 67, size: 2, dur: 2.9, delay: 0.2 },
		{ top: 70, left: 12, size: 3, dur: 4.6, delay: 0.8 },
		{ top: 30, left: 91, size: 2, dur: 3.3, delay: 1.5 },
		{ top: 12, left: 48, size: 2, dur: 3.8, delay: 1.9 },
		{ top: 80, left: 24, size: 2, dur: 3.0, delay: 0.6 },
		{ top: 64, left: 78, size: 2, dur: 4.0, delay: 2.2 },
		{ top: 36, left: 56, size: 2, dur: 3.4, delay: 1.1 },
		{ top: 18, left: 73, size: 2, dur: 3.7, delay: 0.3 },
		{ top: 50, left: 5, size: 2, dur: 4.4, delay: 1.7 },
		{ top: 84, left: 60, size: 2, dur: 3.2, delay: 0.9 },
		{ top: 46, left: 95, size: 3, dur: 4.1, delay: 0.4 },
		{ top: 26, left: 20, size: 2, dur: 3.5, delay: 1.4 },
		{ top: 74, left: 45, size: 2, dur: 2.8, delay: 2.0 }
	];

	const title = [
		{ ch: "D", y: 4, rot: -9 },
		{ ch: "i", y: -2, rot: -6 },
		{ ch: "a", y: -5, rot: -2 },
		{ ch: "d", y: -5, rot: 2 },
		{ ch: "e", y: -2, rot: 6 },
		{ ch: "m", y: 4, rot: 10 }
	];
</script>

<div
	class="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-linear-180 from-indigo-950 to-40% to-blue-900 text-center"
	style:padding-top="env(safe-area-inset-top)"
	style:padding-bottom="env(safe-area-inset-bottom)"
>
	<!-- Twinkling star field, confined to the top 16% of the screen. -->
	<div class="pointer-events-none absolute inset-x-0 top-0 h-[25%]" aria-hidden="true">
		{#each stars as s (s.top + "-" + s.left)}
			<span
				class="twinkle"
				style="top:{s.top}%; left:{s.left}%; width:{s.size}px; height:{s.size}px; animation-duration:{s.dur}s; animation-delay:{s.delay}s;"
			></span>
		{/each}
	</div>

	<div
		class="flex flex-col justify-center relative gap-6 h-full pt-safe-inset-top pb-safe-inset-bottom mb-8 mt-4 w-full px-6">

		<div class="flex flex-col items-center justify-center text-sky-100 w-full h-full">
			<h1 class="arched-title flex items-baseline text-6xl font-bold tracking-[0.15em] mb-4">
				{#each title as t, i (i)}
					<span style="transform: translateY({t.y}px) rotate({t.rot}deg)">{t.ch}</span>
				{/each}
			</h1>

			<p class="mt-6 max-w-xs text-xl font-medium text-sky-100">
				{m.instance_gate_prompt()}
			</p>

			<div class="w-full mt-10">
				<input
					class="w-full max-w-sm bg-sky-100 text-indigo-900 placeholder:text-blue-900/50 py-4 px-4 rounded-md outline-sky-300/50 outline-3 text-xl font-medium transition-all duration-150 ease-out focus:outline-sky-300/75 focus:outline-4"
					bind:value
					onchange={() => checkConnection()}
					oninput={resetConnectionState}
					{onkeydown}
					type="url"
					inputmode="url"
					autocapitalize="none"
					autocorrect="off"
					spellcheck="false"
					placeholder="..."
				/>
			</div>
			<div class="relative w-full">
				{#if checking || mapName || failed}
				<div
					class="mt-2 text-base text-sky-100 font-semibold flex items-center gap-1.5 fixed w-full justify-center right-0 left-0"
					transition:fly={{ duration: 140, y: -10 }}
				>
					{#if checking}
						<LoaderCircle class="size-4 stroke-[2.5] animate-spin mt-0.5" />
						{m.connection_checking()}
					{:else if mapName}
						<CircleCheck class="size-4 stroke-[2.5] mt-0.5" />
						{m.connecting_to_name({ name: mapName })}
					{:else if failed}
						<CircleX class="size-4 stroke-[2.5]" />
						{m.connection_failed()}
					{/if}
				</div>
				{/if}
			</div>
		</div>

		<div class="w-full h-fit flex flex-col items-center gap-4">
			<Button
				variant=""
				onclick={connect}
				disabled={!mapName}
				class="disabled:opacity-50 bg-linear-0 from-sky-100/50 from-5% via-sky-50/75 to-95% to-white/90 w-full max-w-sm h-16 rounded-md outline-sky-100/75 outline-2 text-indigo-900/90 text-lg! font-semibold transition-all! duration-150 ease-out active:outline-1 active:opacity-95"
			>
				{m.connect()}
				<ArrowRight class="size-4 stroke-[2.5]" />
			</Button>
<!--			<Button-->
<!--				variant=""-->
<!--				onclick={checkConnection}-->
<!--				class="bg-linear-0 from-indigo-700/50 from-5%  via-indigo-600/75 to-95% to-indigo-600/90 w-full max-w-sm h-16 rounded-md outline-indigo-600/80 outline-2 text-sky-100/75 text-lg! font-semibold transition-all! duration-150 ease-out active:outline-1 active:opacity-95"-->
<!--			>-->
<!--				&lt;!&ndash;			<Radio class="size-4 stroke-[2.5]" />&ndash;&gt;-->
<!--				{#if checking}-->
<!--					<LoaderCircle class="size-4 stroke-[2.5] animate-spin" />-->
<!--					Checking...-->
<!--				{:else if mapName}-->
<!--					<CircleCheck class="size-4 stroke-[2.5]" />-->
<!--					{mapName} works-->
<!--				{:else if failed}-->
<!--					<CircleX class="size-4 stroke-[2.5]" />-->
<!--					Connection failed-->
<!--				{:else}-->
<!--					Check connection-->
<!--				{/if}-->

<!--			</Button>-->
		</div>

	</div>
</div>

<style>
    .arched-title span {
        display: inline-block;
        transform-origin: center bottom;
    }

    .twinkle {
        position: absolute;
        border-radius: 9999px;
        background: #ffffff;
        box-shadow: 0 0 6px 1px rgba(191, 219, 254, 0.85);
        opacity: 0.15;
        animation-name: twinkle;
        animation-timing-function: ease-in-out;
        animation-iteration-count: infinite;
        will-change: opacity, transform;
    }

    @keyframes twinkle {
        0%,
        100% {
            opacity: 0.12;
            transform: scale(0.6);
        }
        50% {
            opacity: 0.9;
            transform: scale(1);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .twinkle {
            animation: none;
            opacity: 0.5;
        }
    }
</style>
