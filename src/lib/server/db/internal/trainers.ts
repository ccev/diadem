import { db } from "@/lib/server/db/internal/index";
import * as table from "@/lib/server/db/internal/schema";
import { and, asc, eq, isNotNull } from "drizzle-orm";

/** Resolved trainers (player id → trainer name) for a user, used on every pokemon scan. */
export type PersonalTrainers = Map<string, string>;
/** linked_trainer id → player id, so filtersets can name specific trainers. */
export type PersonalTrainerLinks = Map<string, string>;

const CACHE_TTL_MS = 60_000;
const cache = new Map<
	string,
	{ at: number; trainers: PersonalTrainers; links: PersonalTrainerLinks }
>();

function invalidate(userId: string) {
	cache.delete(userId);
}

export function listLinkedTrainers(userId: string) {
	return db
		.select()
		.from(table.linkedTrainer)
		.where(eq(table.linkedTrainer.userId, userId))
		.orderBy(asc(table.linkedTrainer.createdAt));
}

export async function getPersonalTrainers(
	userId: string
): Promise<{ trainers: PersonalTrainers; links: PersonalTrainerLinks }> {
	const cached = cache.get(userId);
	if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached;

	const rows = await db
		.select({
			id: table.linkedTrainer.id,
			playerId: table.linkedTrainer.playerId,
			trainerName: table.linkedTrainer.trainerName
		})
		.from(table.linkedTrainer)
		.where(and(eq(table.linkedTrainer.userId, userId), isNotNull(table.linkedTrainer.playerId)));

	const trainers: PersonalTrainers = new Map();
	const links: PersonalTrainerLinks = new Map();
	for (const row of rows) {
		if (!row.playerId) continue;
		trainers.set(row.playerId, row.trainerName || row.playerId);
		links.set(row.id, row.playerId);
	}
	const entry = { at: Date.now(), trainers, links };
	cache.set(userId, entry);
	return entry;
}

export async function insertPendingTrainer(userId: string, jobId: string, status: string) {
	const now = new Date();
	const id = crypto.randomUUID();
	await db.insert(table.linkedTrainer).values({
		id,
		userId,
		jobId,
		status,
		createdAt: now,
		updatedAt: now
	});
	return id;
}

export async function updateTrainer(
	userId: string,
	id: string,
	values: Partial<Pick<table.LinkedTrainer, "jobId" | "status" | "playerId" | "trainerName">>
) {
	await db
		.update(table.linkedTrainer)
		.set({ ...values, updatedAt: new Date() })
		.where(and(eq(table.linkedTrainer.id, id), eq(table.linkedTrainer.userId, userId)));
	invalidate(userId);
}

export async function deleteTrainer(userId: string, id: string) {
	await db
		.delete(table.linkedTrainer)
		.where(and(eq(table.linkedTrainer.id, id), eq(table.linkedTrainer.userId, userId)));
	invalidate(userId);
}
