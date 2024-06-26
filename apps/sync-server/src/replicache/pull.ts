import { Hono } from "hono";
import type { Bindings, DB, Variables } from "..";
import { db, serverID } from "../db/middleware";
import { and, eq, gt } from "drizzle-orm/sql";
import * as schema from "../db/schema";
import type { PatchOperation, PullRequestV1, PullResponse } from "replicache";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
export default app;

/***
 * Relative to root app
 * Effective path:
 * /api/replicache/pull
 */
app.post("/", db, async (c) => {
	const db = c.get("db");
	const pull = (await c.req.json()) as PullRequestV1;
	console.log("Processing pull", JSON.stringify(pull));
	const { clientGroupID } = pull;
	const fromVersion = (pull.cookie as number | null) ?? 0;
	const t0 = Date.now();

	try {
		// Read all data in a single transaction so it's consistent.
		const batchResponse = await db.batch([
			db.query.replicacheServer.findMany({
				where: eq(schema.replicacheServer.id, serverID),
			}),
			db.query.replicacheClient.findMany({
				where: and(
					eq(schema.replicacheClient.clientGroupId, clientGroupID),
					gt(schema.replicacheClient.version, fromVersion),
				),
			}),
			db.query.message.findMany({
				where: gt(schema.message.version, fromVersion),
			}),
		]);
		const [serverRecord, clientRecords, changed] = batchResponse;
		const lastMutationIDChanges = Object.fromEntries(
			clientRecords.map((r) => [r.id, r.lastMutationId]),
		);

		if (serverRecord.length !== 1) {
			throw new Error("Not exactly one server record found");
		}
		const currentVersion = serverRecord[0].version;
		if (!currentVersion) {
			throw new Error("Server version not found");
		}

		if (fromVersion > currentVersion) {
			throw new Error(
				`fromVersion ${fromVersion} is from the future - aborting. This can happen in development if the server restarts. In that case, clear appliation data in browser and refresh.`,
			);
		}

		// Build and return response.
		const patch: PatchOperation[] = [];
		for (const row of changed) {
			const { id, sender, content, ord, version: rowVersion, deleted } = row;
			if (deleted) {
				if (rowVersion > fromVersion) {
					patch.push({
						op: "del",
						key: `message/${id}`,
					});
				}
			} else {
				patch.push({
					op: "put",
					key: `message/${id}`,
					value: {
						from: sender,
						content,
						order: ord,
					},
				});
			}
		}

		const body: PullResponse = {
			lastMutationIDChanges: lastMutationIDChanges ?? {},
			cookie: currentVersion,
			patch,
		};
		return c.json(body);
	} catch (e) {
		console.error(e);
		c.status(500);
		return c.text(e as string);
	} finally {
		console.log("Processed pull in", Date.now() - t0);
	}
});

async function getLastMutationIDChanges(
	db: DB,
	clientGroupID: string,
	fromVersion: number,
) {
	const rows = await db.query.replicacheClient.findMany({
		where: and(
			eq(schema.replicacheClient.clientGroupId, clientGroupID),
			gt(schema.replicacheClient.version, fromVersion),
		),
	});
	return Object.fromEntries(rows?.map((r) => [r.id, r.lastMutationId]));
}
