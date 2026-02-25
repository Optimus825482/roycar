import path from "node:path";
import { defineConfig } from "prisma/config";

import { config } from "dotenv";
config({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "psql -h localhost -U postgres -d fb_careerdb -f prisma/seed.sql",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
