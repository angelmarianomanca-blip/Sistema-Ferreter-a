import "dotenv/config";
import path from "path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db, libsqlClient } from "./index";

async function main() {
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  console.log(`Aplicando migraciones desde ${migrationsFolder}...`);
  await libsqlClient.execute("PRAGMA foreign_keys = ON;");
  await migrate(db, { migrationsFolder });
  console.log("Migraciones aplicadas correctamente.");
  libsqlClient.close();
}

main().catch((err) => {
  console.error("Error al aplicar migraciones:", err);
  process.exit(1);
});
