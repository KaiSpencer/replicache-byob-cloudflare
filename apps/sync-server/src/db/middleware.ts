import type { Context } from "hono";
import * as schema from "./schema";

import { drizzle } from "drizzle-orm/d1";
import { Resource } from "sst";

export const serverID = 1;

export async function db(c: Context, next: () => Promise<void>) {
	c.set("db", drizzle(Resource.DB, { schema }));
	await next();
}
