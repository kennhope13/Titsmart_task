import prisma from './prismaClient';

async function main() {
  const projects = await prisma.project.findMany();
  console.log('--- Projects ---');
  projects.forEach(p => console.log(`${p.code}: ${p.name} (${p.id})`));

  const planCount = await prisma.projectMaterialPlan.count();
  console.log('\nMaterial Plan Count:', planCount);

  const purchasingCount = await prisma.projectPurchasing.count();
  console.log('Purchasing Plan Count:', purchasingCount);

  const expenseCount = await prisma.projectExpense.count();
  console.log('Expense Count:', expenseCount);

  const laborCount = await prisma.laborPayroll.count();
  console.log('Labor Payroll Count:', laborCount);

  // Group by project_id for plans
  const planGroups = await prisma.projectMaterialPlan.groupBy({
    by: ['project_id'],
    _count: true
  });
  console.log('\nPlans by project:');
  for (const group of planGroups) {
    const proj = projects.find(p => p.id === group.project_id);
    console.log(`  - ${proj ? proj.code : group.project_id}: ${group._count} plans`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
