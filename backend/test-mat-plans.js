const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.projectMaterialPlan.findMany({
    take: 10,
    orderBy: { created_at: 'desc' },
    select: { stt: true, job_content: true, unit: true, contract_volume: true }
  });
  console.log("Material Plans:", plans);
}
main().catch(console.error).finally(() => prisma.$disconnect());
