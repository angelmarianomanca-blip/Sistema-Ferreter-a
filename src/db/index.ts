import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "file:./local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;

export const libsqlClient = createClient({
  url: databaseUrl,
  authToken,
});

export const db = drizzle(libsqlClient, { schema });

export type DbClient = typeof db;
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbOrTx = DbClient | DbTransaction;
