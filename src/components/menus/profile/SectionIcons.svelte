<script lang="ts">
	import { Image } from 'lucide-svelte';
	import MenuCard from '@/components/menus/MenuCard.svelte';
	import * as m from '@/lib/paraglide/messages';
	import IconSelect from '@/components/menus/profile/IconSelect.svelte';
</script>

<MenuCard
	title={m.settings_icons()}
	Icon={Image}
>
	<IconSelect
		title={m.pogo_pokemon()}
		type="pokemon"
		getIconParams={{pokemon_id: 25}}
	/>
	<IconSelect
		title={m.pogo_pokestop()}
		type="pokestop"
	/>
	<IconSelect
		title={m.pogo_gym()}
		type="gym"
	/>
	<IconSelect
		title={m.pogo_station()}
		type="station"
	/>
</MenuCard>