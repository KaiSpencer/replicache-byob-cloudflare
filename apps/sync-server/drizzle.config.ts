import type { Config } from "drizzle-kit";
import { Resource } from "sst";

export default {
	schema: "./src/db/schema.ts",
	driver: "d1-http",
	out: "drizzle",
	dialect: "sqlite",
	dbCredentials: {
		accountId: Resource.CloudflareAccountId.value,
		databaseId: Resource.DatabaseId.value,
		token: Resource.CloudflareApiToken.value,
	},
} satisfies Config;
