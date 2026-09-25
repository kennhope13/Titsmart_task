import prisma from './prismaClient';

async function main() {
  console.log('Clearing issue and issue_status fields from database tasks...');
  const result = await prisma.task.updateMany({
    data: {
      issue: null,
      issue_status: null,
      issue_summary: null,
      issue_status_text: null
    }
  });
  console.log('Successfully updated tasks in DB:', result);
}

main()
  .catch((e) => {
    console.error('Error clearing task issue fields:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
