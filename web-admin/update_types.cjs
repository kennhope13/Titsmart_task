
const fs = require('fs');
let file = fs.readFileSync('src/types/index.ts', 'utf8');

const permTypes = \
export type Permission = 
  | 'VIEW_PROJECTS' | 'CREATE_PROJECTS' | 'EDIT_PROJECTS' | 'DELETE_PROJECTS'
  | 'VIEW_TASKS' | 'IMPORT_TASKS' | 'EDIT_TASKS' | 'ASSIGN_TASKS' | 'UPDATE_TASK_PROGRESS' | 'APPROVE_TASKS'
  | 'VIEW_MATERIALS' | 'IMPORT_MATERIALS' | 'EDIT_MATERIALS' | 'UPDATE_MATERIAL_STATUS'
  | 'VIEW_FINANCE' | 'EDIT_PRICES' | 'VIEW_PAYMENTS' | 'EDIT_PAYMENTS' | 'VIEW_EXPENSES' | 'EDIT_EXPENSES'
  | 'VIEW_DOCUMENTS' | 'MANAGE_DOCUMENTS'
  | 'VIEW_USERS' | 'MANAGE_USERS' | 'MANAGE_PERMISSIONS' | 'MANAGE_PAYROLL'
  | 'EXPORT_DATA';

\;

file = permTypes + file;
file = file.replace(/projectCodes\\?\\: string\\[\\]\\;/g, 'projectCodes?: string[];\n  permissions?: string[];');
fs.writeFileSync('src/types/index.ts', file);
console.log('done');

