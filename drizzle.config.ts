import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "sqlite",
	out: "./drizzle/migrations",
	schema: "./app/db/schema.ts",
});
