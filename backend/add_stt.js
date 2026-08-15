const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Adding stt column to materials table...");
    await prisma.$executeRawUnsafe(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS stt INTEGER;`);
    console.log("Successfully added stt column.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
