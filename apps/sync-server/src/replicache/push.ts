import { Hono } from "hono";
import type { Bindings, DB, Variables } from "..";
import {
	type MessageWithID,
	oneOrNullFromFindMany,
} from "@replicache-byob-cloudflare/shared";
import { eq } from "drizzle-orm";
import type { PushRequestV1, MutationV1 } from "replicache";
import { db, serverID } from "../db/middleware";
import * as schema from "./../db/schema";
import { Pusher } from "./../pusher";
import { Resource } from "sst";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
export default app;

/***
 * Relative to root app
 * Effective path:
 * /api/replicache/push
 */
app.post("/", db, async (c) => {
	const db = c.get("db");
	const push = await c.req.json<PushRequestV1>();
	console.log("Processing push", JSON.stringify(push));

	const t0 = Date.now();
	try {
		// Iterate each mutation in the push.
		for (const mutation of push.mutations) {
			const t1 = Date.now();

			try {
				await processMutation(db, push.clientGroupID, mutation);
			} catch (e) {
				console.error("Caught error from mutation", mutation, e);

				// Handle errors inside mutations by skipping and moving on. This is
				// convenient in development but you may want to reconsider as your app
				// gets close to production:
				// https://doc.replicache.dev/reference/server-push#error-handling
				await processMutation(db, push.clientGroupID, mutation, e as string);
			}

			console.log("Processed mutation in", Date.now() - t1);
		}

		await sendPoke();
		return c.json({});
	} catch (e) {
		console.error(e);
		c.status(500);
		return c.text(e as string);
	} finally {
		console.log("Processed push in", Date.now() - t0);
	}
});

async function processMutation(
	db: DB,
	clientGroupID: string,
	mutation: MutationV1,
	error?: string | undefined,
) {
	const { clientID } = mutation;

	console.log("Client ID", clientID);

	const prevServerRecord = await db.query.replicacheServer.findFirst({
		where: eq(schema.replicacheServer.id, serverID),
	});
	if (!prevServerRecord?.version) {
		throw new Error("Server record not found");
	}
	const nextVersion = prevServerRecord.version + 1;

	const lastMutationID = await getLastMutationID(db, clientID);
	const nextMutationID = lastMutationID + 1;

	console.log("nextVersion", nextVersion, "nextMutationID", nextMutationID);

	// It's common due to connectivity issues for clients to send a
	// mutation which has already been processed. Skip these.
	if (mutation.id < nextMutationID) {
		console.log(
			`Mutation ${mutation.id} has already been processed - skipping`,
		);
		return;
	}

	// If the Replicache client is working correctly, this can never
	// happen. If it does there is nothing to do but return an error to
	// client and report a bug to Replicache.
	if (mutation.id > nextMutationID) {
		throw new Error(
			`Mutation ${mutation.id} is from the future - aborting. This can happen in development if the server restarts. In that case, clear appliation data in browser and refresh.`,
		);
	}

	if (error === undefined) {
		console.log("Processing mutation:", JSON.stringify(mutation));

		// For each possible mutation, run the server-side logic to apply the
		// mutation.
		switch (mutation.name) {
			case "createMessage":
				await createMessage(db, mutation.args as MessageWithID, nextVersion);
				break;
			default:
				throw new Error(`Unknown mutation: ${mutation.name}`);
		}
	} else {
		// TODO: You can store state here in the database to return to clients to
		// provide additional info about errors.
		console.log(
			"Handling error from mutation",
			JSON.stringify(mutation),
			error,
		);
	}

	console.log("setting", clientID, "last_mutation_id to", nextMutationID);
	// Update lastMutationID for requesting client.
	await setLastMutationID(
		db,
		clientID,
		clientGroupID,
		nextMutationID,
		nextVersion,
	);

	// Update global version.
	await db.update(schema.replicacheServer).set({ version: nextVersion });
}

export async function getLastMutationID(db: DB, clientID: string) {
	const clientRow = await db.query.replicacheClient
		.findMany({
			where: eq(schema.replicacheClient.id, clientID),
		})
		.then(oneOrNullFromFindMany);
	if (!clientRow) {
		return 0;
	}
	return clientRow.lastMutationId;
}

async function setLastMutationID(
	db: DB,
	clientID: string,
	clientGroupID: string,
	mutationID: number,
	version: number,
) {
	const result = await db
		.update(schema.replicacheClient)
		.set({
			clientGroupId: clientGroupID,
			lastMutationId: mutationID,
			version: version,
		})
		.where(eq(schema.replicacheClient.id, clientID));
	if (result.results.length === 0) {
		await db.insert(schema.replicacheClient).values({
			id: clientID,
			clientGroupId: clientGroupID,
			lastMutationId: mutationID,
			version: version,
		});
	}
}

async function createMessage(
	db: DB,
	{ content, from, id, order }: MessageWithID,
	version: number,
) {
	await db.insert(schema.message).values({
		content,
		deleted: false,
		ord: order,
		sender: from,
		version: version,
		id: id,
	});
}

async function sendPoke() {
	const pusher = new Pusher(
		Resource.PusherAppId.value,
		Resource.PusherKey.value,
		Resource.PusherSecret.value,
		Resource.PusherCluster.value,
	);
	const t0 = Date.now();
	await pusher.trigger("default", "poke", {});
	console.log("Sent poke in", Date.now() - t0);
}
