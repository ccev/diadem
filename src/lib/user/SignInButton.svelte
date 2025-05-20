<script lang="ts">
	import Button from '@/components/ui/basic/Button.svelte';
	import { getLoginLink } from '@/lib/user/login';
	import DiscordIcon from '@/components/icons/DiscordIcon.svelte';
	import { X } from 'lucide-svelte';
</script>

<Button
	class="rounded-lg! border-slate-200 border-1 gap-2 pointer-events-autos mx-2"
	variant="secondary"
	size="sm"
	tag="a"
	href={getLoginLink()}
>
	<DiscordIcon class="w-3 fill-foreground" />
	<span>
		Link with Discord to unlock more features
	</span>
	<X size="18" />
</Button>