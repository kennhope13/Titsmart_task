import prisma from './prismaClient';

async function main() {
  const projects = await prisma.project.findMany();
  console.log("PROJECTS:", projects.map(p => ({ id: p.id, code: p.code, name: p.name })));
  
  const phuocTanProj = projects.find(p => p.name.includes("Phước Tân") || p.code.includes("Phước Tân") || p.name.includes("Phuoc Tan"));
  if (!phuocTanProj) {
    console.log("Project Phước Tân not found!");
    return;
  }
  
  console.log("Querying for Project:", phuocTanProj.code);
  const materialPlans = await prisma.projectMaterialPlan.findMany({
    where: { project_id: phuocTanProj.id },
    select: { id: true, stt: true, job_content: true, notes: true, parent_id: true }
  });
  
  console.log("Material Plans (first 30):", materialPlans.slice(0, 30));
  
  const purchasingPlans = await prisma.projectPurchasing.findMany({
    where: { project_id: phuocTanProj.id },
    select: { id: true, stt: true, content: true, notes: true, parent_id: true }
  });
  console.log("Purchasing Plans (first 30):", purchasingPlans.slice(0, 30));
}

main().catch(console.error).finally(() => prisma.$disconnect());
