import { defineConfig } from "prisma/config"

/**
 * Prisma CLI configuration (generate / db push / migrate).
 * The runtime connection is wired in src/lib/db.ts through the libSQL driver
 * adapter — this file only serves Prisma CLI commands.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // SQLite file for local CLI commands; on Turso the data is managed remotely.
    url: process.env.DATABASE_URL ?? "file:./db/custom.db",
  },
})
