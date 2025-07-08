<script lang="ts">
	import Button from '@/components/ui/basic/Button.svelte';
	import { getUserDetails } from '@/lib/user/userDetails.svelte.js';
	import { getLoginLink } from '@/lib/user/login';
	import * as m from '@/lib/paraglide/messages';
	import LogOutButton from '@/components/ui/user/LogOutButton.svelte';
	// noinspection ES6UnusedImports
	import { Avatar } from 'bits-ui';
	import DiscordIcon from '@/components/icons/DiscordIcon.svelte';
	import { Link2Off, LogOut } from 'lucide-svelte';
	import { getConfig } from '@/lib/config/config';


	let details = $derived(getUserDetails().details);
	let isLoggingOut = $state(false);
</script>

{#if details}
	<div
		class="rounded-lg border bg-card text-card-foreground shadow-md overflow-hidden"
		class:animate-pulse={isLoggingOut}
	>
		<div class="p-4 flex items-center justify-start gap-4 w-full">
			<Avatar.Root
				class="shrink-0 bg-muted text-muted-foreground h-12 w-12 rounded-full text-lg uppercase"
			>
				<div
					class="flex h-full w-full items-center justify-center overflow-hidden rounded-full"
				>
					<Avatar.Image src={details.avatarUrl} alt={details.displayName} />
					<Avatar.Fallback>
						{details.displayName?.[0]}
					</Avatar.Fallback>
				</div>
			</Avatar.Root>

			<p>
				<b class="-mb-1">
					{details.displayName}
				</b>
				<br />
				<span class="text-muted-foreground">
				{details.username}
			</span>
			</p>
			<div class="flex-1 flex justify-end">
				{#if !getUserDetails().isGuildMember}
					<Button
						tag="a"
						href={getConfig().discord.serverLink}
						class="mr-2"
					>
						Join Server
					</Button>
				{/if}
				<LogOutButton class="" size="icon" variant="outline" title={m.signout()} bind:isLoggingOut>
					<!--{m.signout()}-->
					<Link2Off size="16" />
				</LogOutButton>
			</div>
		</div>
		<!--{:else}-->
		<!--		<Button-->
		<!--			class="p-4 gap-3! items-center w-full rounded-md"-->
		<!--			variant="ghost"-->
		<!--			tag="a"-->
		<!--			href={getLoginLink()}-->
		<!--			size=""-->
		<!--		>-->
		<!--			<DiscordIcon class="w-4 fill-foreground shrink-0" />-->
		<!--			<p>-->
		<!--				{m.signin_prompt_part_1()}-->
		<!--				<b class="underline">-->
		<!--				{m.signin_prompt_bold()}-->
		<!--				</b>-->
		<!--				{m.signin_prompt_part_2()}-->
		<!--			</p>-->
		<!--		</Button>-->
	</div>
{/if}
