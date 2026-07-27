import { Request, Response } from 'express';
import prisma from '../prismaClient';

const formatTask = (t: any) => ({
  id: t.id,
  project_id: t.project_id,
  projectCode: t.project?.code || '',
  projectName: t.project?.name || '',
  stt: t.stt,
  code: t.code,
  name: t.name,
  volume: Number(t.volume),
  unit: t.unit,
  progress: Number(t.progress),
  status: t.status,
  priority: t.priority,
  purchaseStatus: t.purchase_status,
  constrStatus: t.construction_status,
  issue: t.issue_summary || '',
  issueStatus: t.issue_status_text || '',
  isDone: t.is_done,
  isSectionHeader: t.is_section_header,
  sectionName: t.section_name || '',
  notes: t.notes || '',
  assignedEngineerId: t.assigned_engineer_id,
  assignedEngineerName: t.assigned_engineer?.full_name || '',
  dueDate: t.due_date,
});

export const getTasks = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { project_id: String(projectId) } : {};
    const tasks = await prisma.task.findMany({
      where: filter,
      include: {
        project: true,
        assigned_engineer: true,
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(tasks.map(formatTask));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        assigned_engineer: true,
      },
    });
    if (task) {
      res.json(formatTask(task));
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const { projectCode, projectName, purchaseStatus, constrStatus, issue, issueStatus, assignedEngineerName, isDone, isSectionHeader, sectionName, ...data } = req.body;
    
    let projectId = data.project_id;
    if (!projectId && projectCode) {
      const proj = await prisma.project.findUnique({ where: { code: projectCode } });
      if (proj) projectId = proj.id;
    }

    if (!projectId) {
      return res.status(400).json({ error: 'Project not found for code: ' + projectCode });
    }

    const task = await prisma.task.create({
      data: {
        stt: data.stt,
        code: data.code || `TSK-${projectCode}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: data.name,
        volume: data.volume,
        unit: data.unit,
        progress: data.progress,
        status: data.status,
        priority: data.priority,
        purchase_status: purchaseStatus || '',
        construction_status: constrStatus || '',
        issue_summary: issue || '',
        issue_status_text: issueStatus || '',
        is_done: isDone || false,
        is_section_header: isSectionHeader || false,
        section_name: sectionName || '',
        notes: data.notes || '',
        assigned_engineer_id: data.assignedEngineerId || null,
        due_date: data.dueDate ? new Date(data.dueDate) : null,
        project_id: projectId,
      },
      include: {
        project: true,
        assigned_engineer: true,
      }
    });
    res.status(201).json(formatTask(task));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { projectCode, projectName, purchaseStatus, constrStatus, issue, issueStatus, assignedEngineerName, isDone, isSectionHeader, sectionName, ...data } = req.body;
    
    const updateData: any = {
      ...data
    };
    if (purchaseStatus !== undefined) updateData.purchase_status = purchaseStatus;
    if (constrStatus !== undefined) updateData.construction_status = constrStatus;
    if (issue !== undefined) updateData.issue_summary = issue;
    if (issueStatus !== undefined) updateData.issue_status_text = issueStatus;
    if (isDone !== undefined) updateData.is_done = isDone;
    if (isSectionHeader !== undefined) updateData.is_section_header = isSectionHeader;
    if (sectionName !== undefined) updateData.section_name = sectionName;
    if (data.assignedEngineerId !== undefined) updateData.assigned_engineer_id = data.assignedEngineerId;
    if (data.dueDate !== undefined) updateData.due_date = data.dueDate ? new Date(data.dueDate) : null;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        project: true,
        assigned_engineer: true,
      },
    });
    res.json(formatTask(task));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

