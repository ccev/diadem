<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte.js";
	import { getLoginLink } from "@/lib/services/user/login";
	import * as m from "@/lib/paraglide/messages";
	import LogOutButton from "@/components/ui/user/LogOutButton.svelte";
	// noinspection ES6UnusedImports
	import { Avatar } from "bits-ui";
	import DiscordIcon from "@/components/icons/DiscordIcon.svelte";
	import { Link2Off, LogOut } from "lucide-svelte";
	import { getConfig } from "@/lib/services/config/config";

	let details = $derived(getUserDetails().details);
	let isLoggingOut = $state(false);
</script>

{#if details}
	<div
		class="rounded-lg border bg-card text-card-foreground shadow-md overflow-hidden"
		class:animate-pulse={isLoggingOut}
	>
		<div class="p-4 flex flex-wrap items-center justify-start gap-4 w-full">
			<Avatar.Root
				class="shrink-0 bg-muted text-muted-foreground h-12 w-12 rounded-full text-lg uppercase"
			>
				<div class="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
					<Avatar.Image src={details.avatarUrl} alt={details.displayName} />
					<Avatar.Fallback>
						{details.displayName?.[0]}
					</Avatar.Fallback>
				</div>
			</Avatar.Root>

			<p class="flex-1">
				<b class="-mb-1">
					{details.displayName}
				</b>
				<br />
				<span class="text-muted-foreground">
					{details.username}
				</span>
			</p>
			<div class="flex justify-end flex-1">
				{#if !getUserDetails().isGuildMember}
					<Button tag="a" href={getConfig().discord.serverLink} class="mr-2 basis-full">
						{m.join_server()}
					</Button>
				{/if}
				{#if !getUserDetails().isHeaderAuth}
					<LogOutButton
						class="shrink-0"
						size="icon"
						variant="outline"
						title={m.signout()}
						bind:isLoggingOut
					>
						<Link2Off size="16" />
					</LogOutButton>
				{/if}
			</div>
		</div>
	</div>
{/if}
