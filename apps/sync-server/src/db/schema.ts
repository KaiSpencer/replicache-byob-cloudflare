import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const test = sqliteTable("test", {
	id: integer("id").primaryKey(),
});

export const replicacheServer = sqliteTable("replicache_server", {
	id: integer("id").primaryKey(),
	version: integer("version"),
});

export const message = sqliteTable("message", {
	id: text("id").primaryKey().notNull(),
	sender: text("sender").notNull(),
	content: text("content").notNull(),
	ord: integer("ord").notNull(),
	deleted: integer("deleted", { mode: "boolean" }).notNull(),
	version: integer("version").notNull(),
});

export const replicacheClient = sqliteTable("replicache_client", {
	id: text("id", { length: 36 }).primaryKey().notNull(),
	clientGroupId: text("client_group_id").notNull(),
	lastMutationId: integer("last_mutation_id").notNull(),
	version: integer("version").notNull(),
});
