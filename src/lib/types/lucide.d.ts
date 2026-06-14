import type { IconProps } from "lucide-svelte";
import { SvelteComponentTyped } from "svelte";

type Events = { [evt: string]: CustomEvent<any> };
type Slots = { default: {} };
export type LucideIcon = typeof SvelteComponentTyped<typeof IconProps, typeof Events, typeof Slots>;
