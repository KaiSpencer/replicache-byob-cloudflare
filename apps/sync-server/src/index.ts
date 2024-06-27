import { Hono } from "hono";
import { cors } from "hono/cors";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "./db/schema";
import push from "./replicache/push";
import pull from "./replicache/pull";

export type DB = DrizzleD1Database<typeof schema>;

// biome-ignore lint/complexity/noBannedTypes: .
export type Bindings = {};
export type Variables = {
	db: DrizzleD1Database<typeof schema>;
};
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("/api/*", cors());
app.get("/", async (c) => {
	return c.text("Hello Hono!");
});

app.route("/api/replicache/push", push);
app.route("/api/replicache/pull", pull);

export default app;
