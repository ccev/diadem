<script>
	import * as m from "$lib/paraglide/messages.js";
	import { Cloud, Moon, Paintbrush, Sun, Users, Unplug, RotateCcw, UserPlus } from "@lucide/svelte";
	import { mode } from "mode-watcher";
	import { setThemeMode } from "$lib/services/themeMode.ts";
	import RadioGroup from "@/components/ui/input/selectgroup/RadioGroup.svelte";
	import MenuCard from "@/components/menus/MenuCard.svelte";
	import SelectGroupItem from "@/components/ui/input/selectgroup/SelectGroupItem.svelte";
	import MenuGeneric from "@/components/menus/MenuGeneric.svelte";
	import { getIconTeam } from "$lib/services/uicons.svelte.ts";
	import { mTeam } from "$lib/services/ingameLocale.ts";
	import Button from "@/components/ui/input/Button.svelte";
</script>

<MenuCard title="Connected Accounts" Icon={Users}>
	<div class="py-3 px-4 w-full">
<!--		<div class="bg-accent px-4 py-2 rounded-md border border-border">-->
			<div class="flex gap-2 items-center">
				<div class="border border-yellow-300 rounded-full size-6 flex items-center justify-center">
					<span class="text-xs font-semibold">
						70
					</span>
				</div>
				<span class="font-medium">
					roofkletterer
				</span>
				<Button
					class="ml-auto"
					size="icon"
					variant="outline"
				>
					<Unplug class="size-3.5" />
				</Button>
			</div>
<!--			<div class="mt-3">-->
<!--				<Button-->
<!--					size="sm"-->
<!--					variant="secondary"-->
<!--				>-->
<!--					<Unplug class="size-3.5" />-->
<!--					Disconnect-->
<!--				</Button>-->
<!--			</div>-->
<!--			<div class="text-muted-foreground">-->
<!--			<span class="text-yellow-200/90">-->
<!--				Team {mTeam(3)}-->
<!--			</span>-->
<!--				<span>-->
<!--			 · Level 70-->
<!--			</span>-->
<!--			</div>-->
<!--		</div>-->

		<Button
			class="mt-3 w-full"
			variant="outline"
		>
			<UserPlus class="size-3.5" />
			Connect new account
		</Button>
	</div>
</MenuCard>