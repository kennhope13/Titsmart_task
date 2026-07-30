const fs = require('fs');
const p = '..\\backend\\src\\controllers\\projects.controller.ts';
let s = fs.readFileSync(p, 'utf8');
const old = `const mapToPrisma = (data: any) => {
  const mapped: any = { ...data };
  if (data.managerId !== undefined) mapped.manager_id = cleanUuid(data.managerId);
  if (data.managerName !== undefined) mapped.manager_name = data.managerName;
  if (data.startDate !== undefined) mapped.start_date = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) mapped.end_date = data.endDate ? new Date(data.endDate) : null;
  if (data.activeTeams !== undefined) mapped.active_teams = data.activeTeams;
  if (data.progressPercent !== undefined) mapped.progress_percent = data.progressPercent;
  if (data.totalTasks !== undefined) mapped.total_tasks = data.totalTasks;
  if (data.completedTasks !== undefined) mapped.completed_tasks = data.completedTasks;
  if (data.issueTasksCount !== undefined) mapped.issue_tasks_count = data.issueTasksCount;
  
  // Remove camelCase keys
  delete mapped.managerId; delete mapped.managerName; delete mapped.startDate; delete mapped.endDate;
  delete mapped.activeTeams; delete mapped.progressPercent; delete mapped.totalTasks; delete mapped.completedTasks; delete mapped.issueTasksCount;
  return mapped;
};`;
const replacement = `const mapToPrisma = (data: any) => {
  const mapped: any = {};
  const allowedScalarFields = ['code', 'name', 'location', 'status', 'notes'];

  allowedScalarFields.forEach((field) => {
    if (data[field] !== undefined) mapped[field] = data[field];
  });

  if (data.managerId !== undefined) mapped.manager_id = cleanUuid(data.managerId);
  if (data.managerName !== undefined) mapped.manager_name = data.managerName;
  if (data.startDate !== undefined) mapped.start_date = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) mapped.end_date = data.endDate ? new Date(data.endDate) : null;
  if (data.activeTeams !== undefined) mapped.active_teams = data.activeTeams;
  if (data.progressPercent !== undefined) mapped.progress_percent = data.progressPercent;
  if (data.totalTasks !== undefined) mapped.total_tasks = data.totalTasks;
  if (data.completedTasks !== undefined) mapped.completed_tasks = data.completedTasks;
  if (data.issueTasksCount !== undefined) mapped.issue_tasks_count = data.issueTasksCount;

  const extraNotes = [
    data.client ? \`Chủ đầu tư: \${data.client}\` : '',
    data.contractValue ? \`Giá trị hợp đồng: \${data.contractValue}\` : '',
  ].filter(Boolean).join(' | ');
  if (extraNotes) mapped.notes = [mapped.notes, extraNotes].filter(Boolean).join(' | ');

  return mapped;
};`;
if (!s.includes(old)) throw new Error('mapToPrisma block not found');
s = s.replace(old, replacement);
fs.writeFileSync(p, s, 'utf8');
