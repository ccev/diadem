<script lang="ts">
	import ProfileCard from "@/components/ui/user/ProfileCard.svelte";
	import { isSupportedFeature } from "@/lib/services/supportedFeatures";
	import SectionAppearance from "@/components/menus/profile/SectionAppearance.svelte";
	import SectionIcons from "@/components/menus/profile/SectionIcons.svelte";
	import SectionAdvanced from "@/components/menus/profile/SectionAdvanced.svelte";
	import SectionInstance from "@/components/menus/profile/SectionInstance.svelte";
	import SignInButton from "@/components/ui/user/SignInButton.svelte";
	import { isInstanceUrlBaked, isNative } from "@/lib/native/runtime";
	import Button from "@/components/ui/input/Button.svelte";
	import { Smartphone } from "@lucide/svelte";
	import { m } from "@/lib/paraglide/messages";
	import { page } from "$app/state";
</script>

<div class="space-y-2">
	<SignInButton />

	{#if isSupportedFeature("auth")}
		<ProfileCard />
	{/if}

	<SectionAppearance />
	<SectionIcons />
	<SectionAdvanced />
	{#if !isNative()}
		<Button
			tag="a"
			variant="secondary"
			class="w-full"
			href="diadem://instance?url={encodeURIComponent(page.url.origin)}"
		>
			<Smartphone class="size-4" />
			{m.open_in_diadem_app()}
		</Button>
	{/if}
	{#if isNative() && !isInstanceUrlBaked()}
		<SectionInstance />
	{/if}
</div>
