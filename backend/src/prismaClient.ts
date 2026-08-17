import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
pool.on('error', (err) => console.error('Unexpected error on idle client', err));
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
