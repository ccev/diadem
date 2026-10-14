import { db } from "@/lib/server/db/internal/index";
import { getLogger } from "@/lib/utils/logger";
import { sql } from "drizzle-orm";

const log = getLogger("db");

// Matches what drizzle-kit generates for linkedTrainer in schema.ts, so a later db:push sees no
// difference. Created here rather than by db:push because existing installs would otherwise
// need a push on upgrade, and drizzle-kit misreads MariaDB schemas (it plans destructive
// changes such as truncating the user table).
const CREATE_LINKED_TRAINER = sql`
	CREATE TABLE IF NOT EXISTS \`linked_trainer\` (
		\`id\` varchar(255) NOT NULL,
		\`user_id\` varchar(255) NOT NULL,
		\`job_id\` varchar(255),
		\`status\` varchar(32) NOT NULL,
		\`player_id\` varchar(255),
		\`trainer_name\` varchar(255),
		\`created_at\` datetime NOT NULL,
		\`updated_at\` datetime NOT NULL,
		CONSTRAINT \`linked_trainer_id\` PRIMARY KEY(\`id\`),
		CONSTRAINT \`linked_trainer_user_player_unique\` UNIQUE(\`user_id\`, \`player_id\`),
		INDEX \`linked_trainer_user_id_idx\` (\`user_id\`),
		CONSTRAINT \`linked_trainer_user_id_user_id_fk\` FOREIGN KEY (\`user_id\`)
			REFERENCES \`user\`(\`id\`) ON DELETE cascade ON UPDATE no action
	)
`;

/** Creates the personal shiny table if it is missing. Failures are logged, not thrown. */
export async function ensureLinkedTrainerTable() {
	try {
		await db.execute(CREATE_LINKED_TRAINER);
	} catch (err) {
		log.error("Could not create the linked_trainer table; personal shinies won't work: %s", err);
	}
}
