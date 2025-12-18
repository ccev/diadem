<script lang="ts">
	import Button from '@/components/ui/input/Button.svelte';
	import { getLoginLink } from '@/lib/services/user/login';
	import DiscordIcon from '@/components/icons/DiscordIcon.svelte';
	import { X } from 'lucide-svelte';
	import * as m from '@/lib/paraglide/messages';
	import { hasLoadedFeature, LoadedFeature } from "@/lib/services/initialLoad.svelte";
	import { isSupportedFeature } from "@/lib/services/supportedFeatures";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte";

	let show = $derived(
		hasLoadedFeature(LoadedFeature.SUPPORTED_FEATURES, LoadedFeature.USER_DETAILS)
		&& isSupportedFeature("auth")
		&& !getUserDetails().details
	)
</script>

{#if show}
	<Button
		class="px-4 py-4 gap-3! whitespace-normal! items-center w-full bg-card border rounded-lg shadow-md flex justify-center hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground pointer-events-auto disabled:pointer-events-none"
		variant=""
		size=""
		tag="a"
		href={getLoginLink()}
	>
		<DiscordIcon class="w-4 fill-foreground shrink-0" />
		<p class="">
			{m.signin_prompt_part_1()}
			<a href={getLoginLink()} class="font-semibold underline">
				{m.signin_prompt_bold()}
			</a>
			{m.signin_prompt_part_2()}
		</p>
	</Button>
{/if}