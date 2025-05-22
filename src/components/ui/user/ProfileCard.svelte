<script lang="ts">
	import Button from '@/components/ui/basic/Button.svelte';
	import { getUserDetails } from '@/lib/user/userDetails.svelte.js';
	import { getLoginLink } from '@/lib/user/login';
	import * as m from '@/lib/paraglide/messages';
	import LogOutButton from '@/components/ui/user/LogOutButton.svelte';
	import { Avatar } from 'bits-ui';
	import DiscordIcon from '@/components/icons/DiscordIcon.svelte';
	import { Link2Off, LogOut } from 'lucide-svelte';
	import { getConfig } from '@/lib/config/config';

	let details = $derived(getUserDetails().details);
	let isLoggingOut = $state(false)
</script>

<div
	class="py-4 px-4 mx-2 rounded-lg border bg-card text-card-foreground shadow-md"
	class:animate-pulse={isLoggingOut}
>
	{#if details}
		<div class="flex items-center justify-start gap-4 w-full">
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
<!--		<Button-->
<!--			class="gap-3! items-center w-full"-->
<!--			variant="ghost"-->
<!--			tag="a"-->
<!--			href={getLoginLink()}-->
<!--			size="sm"-->
<!--		>-->
<!--			<DiscordIcon class="w-4 fill-foreground shrink-0" />-->
<!--			<p>-->
<!--				To unlock more features,-->
<!--				<b class="underline text-accent-foreground">join the Discord server</b>-->
<!--			</p>-->
<!--		</Button>-->
	{:else}
<!--		<div class="text-center w-full text-sm mb-2">Unlock more features</div>-->
<!--		<div class="flex-col gap-4">-->

<!--			<Button-->
<!--				class="w-full"-->
<!--				variant="default"-->
<!--				tag="a"-->
<!--				href={getLoginLink()}-->
<!--			>-->
<!--				<DiscordIcon class="w-4 fill-primary-foreground" />-->
<!--				<span>-->
<!--					Link your Discord account-->
<!--				</span>-->
<!--			</Button>-->
<!--			<Button-->
<!--				class="w-full"-->
<!--				variant="link"-->
<!--				tag="a"-->
<!--				href=""-->
<!--			>-->
<!--				<span>-->
<!--					or join the Discord server-->
<!--				</span>-->
<!--			</Button>-->
<!--		</div>-->
		<Button
			class="gap-3! items-center w-full"
			variant="ghost"
			tag="a"
			href={getLoginLink()}
			size="sm"
		>
			<DiscordIcon class="w-4 fill-foreground shrink-0" />
			<p>
				To unlock more features,
				<b class="underline text-accent-foreground">link your Discord account</b>
			</p>
		</Button>


<!--		and <a href="https://discord.com" class="underline">join the Discord server</a>-->
	{/if}
</div>
