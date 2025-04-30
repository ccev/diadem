<script lang="ts">
	import BottomNavWrapper from '@/components/ui/nav/BottomNavWrapper.svelte';
	import BottomNavSpacing from '@/components/ui/nav/BottomNavSpacing.svelte';
	import Button from '@/components/ui/Button.svelte';
	import { Code, Image, Paintbrush } from 'lucide-svelte';
	import { getConfig } from '@/lib/config';
	import * as m from '@/lib/paraglide/messages';
	import Card from '@/components/ui/Card.svelte';
</script>

<svelte:head>
	<title>{getConfig().general.mapName} | Profile</title>
</svelte:head>

<div class="mt-2 max-w-[30rem] space-y-4">
	<Card class="py-4 px-4 mx-2">
		<div class="flex items-center justify-start gap-4 w-full">
			<div class="bg-slate-200 rounded-full w-14 h-14 shrink-0"></div>
			<div>
				<span class="text-lg font-semibold block -mb-1">Malte</span>
				<span class="text-muted-foreground">@malte0</span>
			</div>
			<div class="flex-1 flex justify-end">
				<Button class="" variant="secondary">Sign out</Button>
			</div>

		</div>
	</Card>

	<Card class="mx-2">
		<Button
			variant="ghost"
			size=""
			class="w-full border-b py-3"
		>
			<div class="w-full flex items-center gap-2 px-4">
				<Paintbrush size="16" />
				{m.settings_appearance()}
			</div>

		</Button>

		<Button
			variant="ghost"
			size=""
			class="w-full border-b py-3"
		>
			<div class="w-full flex items-center gap-2 px-4">
				<Image size="16" />
				{m.settings_icons()}
			</div>

		</Button>

		<Button
			variant="ghost"
			size=""
			class="w-full py-3"
		>
			<div class="w-full flex items-center gap-2 px-4">
				<Code size="16" />
				{m.settings_advanced()}
			</div>

		</Button>
	</Card>
</div>

<BottomNavSpacing />
<BottomNavWrapper page="/settings" />

