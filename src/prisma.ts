import dotenv from 'dotenv';
dotenv.config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
// import { neon, neonConfig } from '@neondatabase/serverless';

// neonConfig.fetchEndpoint = 'http://neon-local:5432/sql';
// neonConfig.useSecureWebSocket = false;
// neonConfig.poolQueryViaFetch = true;
// const sql = neon('postgres://neon:npg@neon-local:5432/neon');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } }); // Add SSL configuration for Neon
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;

//* from prisma docs
// import "dotenv/config";
// import { PrismaPg } from "@prisma/adapter-pg";
// import { PrismaClient } from "../generated/prisma/client";

// const connectionString = `${process.env.DATABASE_URL}`;

// const adapter = new PrismaPg({ connectionString });
// const prisma = new PrismaClient({ adapter });

// export default prisma;

// manual created
// import { PrismaClient } from "@prisma/client";

// const prismaClientSingleton = () => {
//   return new PrismaClient({
//     log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
//   });
// };

// declare const globalThis: {
//   prismaGlobal: ReturnType<typeof prismaClientSingleton>;
// } & typeof global;

// const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// export default prisma;

// if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
