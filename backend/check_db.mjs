import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const tasks = await prisma.task.findMany({
    where: { name: { contains: 'Bộ chuyển đổi nguồn AC' } }
  });
  if (tasks.length > 0) {
    const projId = tasks[0].projectId;
    const all = await prisma.task.findMany({
      where: { projectId: projId, stt: { startsWith: '107' } },
      orderBy: { stt: 'asc' }
    });
    console.log(all.map(t => t.stt + ' | ' + t.name + ' | isSection: ' + t.isSectionHeader));
  } else {
    console.log('Not found');
  }
  process.exit(0);
}
check();
