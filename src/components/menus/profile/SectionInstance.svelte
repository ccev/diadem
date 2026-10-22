<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import { Server, Unplug, Wrench } from "@lucide/svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { clearStoredToken } from "@/lib/native/auth";
	import { setInstanceUrl } from "@/lib/native/runtime";

	import MenuCard from "@/components/menus/MenuCard.svelte";

	const mapName = getConfig().general.mapName;
</script>

<MenuCard title="Diadem Connection" Icon={Server}>
	<p class="font-normal text-sm px-4">
		Your Diadem App is connected to {mapName}
	</p>
	<div class="px-4 mt-2 mb-2">
		<Button
			variant="secondary"
			onclick={async () => {
				await clearStoredToken();
				await setInstanceUrl("");
				window.location.assign("/");
			}}
			class="w-full justify-center"
		>
			<Unplug class="size-4" />
			Disconnect from {mapName}
		</Button>
	</div>
</MenuCard>
