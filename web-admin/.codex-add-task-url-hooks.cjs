const fs = require('fs');
const p = 'src/pages/TaskManagementPage.tsx';
let s = fs.readFileSync(p, 'utf8');
s = s.replace("import React, { useState, useRef, useEffect } from 'react';", "import React, { useState, useRef, useEffect } from 'react';\nimport { useNavigate, useSearchParams } from 'react-router-dom';");
s = s.replace("export const TaskManagementPage: React.FC = () => {\n  const { tasks, projects, engineers, addTask, addTasksBatch, updateTask, addProject, addEngineer, assignEngineer, deleteTask } = useRealtimeStore();", "export const TaskManagementPage: React.FC = () => {\n  const navigate = useNavigate();\n  const [searchParams] = useSearchParams();\n  const selectedProjectFromUrl = searchParams.get('project') || '';\n  const { tasks, projects, engineers, addTask, addTasksBatch, updateTask, addProject, addEngineer, assignEngineer, deleteTask } = useRealtimeStore();");
const insertAfter = `  const [newProjManagerId, setNewProjManagerId] = useState(engineers[0]?.id || '');
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerTitle, setNewManagerTitle] = useState('Chỉ huy trưởng công trình');`;
const effect = `${insertAfter}

  useEffect(() => {
    if (!selectedProjectFromUrl) return;
    setSelectedProjectCode(selectedProjectFromUrl);
    setProjectCode(selectedProjectFromUrl);
  }, [selectedProjectFromUrl]);`;
if (!s.includes(insertAfter)) throw new Error('new project state block not found');
s = s.replace(insertAfter, effect);
fs.writeFileSync(p, s, 'utf8');
