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
  assignedEngineerName: t.assigned_engineer?.full_name || '',
  dueDate: t.due_date,
  parentId: t.parent_id,
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
      orderBy: { created_at: 'asc' },
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

// Map Vietnamese/frontend status strings → Prisma enum
const mapStatus = (s: string | undefined): 'not_started' | 'in_progress' | 'review' | 'done' => {
  if (!s) return 'not_started';
  const v = s.toLowerCase().trim();
  if (v === 'in_progress' || v === 'đang làm' || v === 'dang lam' || v === 'đang thực hiện') return 'in_progress';
  if (v === 'review' || v === 'chờ duyệt' || v === 'cho duyet' || v === 'đang kiểm tra') return 'review';
  if (v === 'done' || v === 'hoàn thành' || v === 'hoan thanh' || v === 'xong') return 'done';
  return 'not_started'; // default: "Chưa làm" / unknown
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cleanUuid = (value: unknown) => (typeof value === 'string' && UUID_RE.test(value) ? value : null);

const truncateText = (value: unknown, max: number) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, max);
};

const optionalTruncateText = (value: unknown, max: number) => {
  const text = truncateText(value, max);
  return text || null;
};

const mapPriority = (p: string | undefined): 'low' | 'medium' | 'high' | undefined => {
  if (!p) return undefined;
  const v = p.toLowerCase().trim();
  if (v === 'high' || v === 'cao') return 'high';
  if (v === 'medium' || v === 'trung bình' || v === 'trung binh') return 'medium';
  if (v === 'low' || v === 'thấp' || v === 'thap') return 'low';
  return undefined;
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const { projectCode, projectName, purchaseStatus, constrStatus, issue, issueStatus, assignedEngineerName, isDone, isSectionHeader, sectionName, parentId, parent_id, ...data } = req.body;
    
    let projectId = data.project_id;
    if (!projectId && projectCode) {
      const proj = await prisma.project.findUnique({ where: { code: projectCode } });
      if (proj) projectId = proj.id;
    }

    if (!projectId) {
      return res.status(400).json({ error: 'Project not found for code: ' + projectCode });
    }

    // Validate parent_id exists before creating to avoid P2003 FK error
    const parentIdClean = cleanUuid(parentId ?? parent_id);
    if (parentIdClean) {
      const parentExists = await prisma.task.findUnique({ where: { id: parentIdClean } });
      if (!parentExists) {
        return res.status(400).json({ error: 'Parent task not found (id=' + parentIdClean + '). Please refresh the page and try again.' });
      }
    }

    const task = await prisma.task.create({
      data: {
        stt: optionalTruncateText(data.stt, 50),
        code: truncateText(data.code || `TSK-${projectCode}-${Date.now()}-${Math.floor(Math.random() * 1000)}`, 100),
        name: data.name,
        volume: data.volume,
        unit: truncateText(data.unit, 50),
        progress: data.progress,
        status: mapStatus(data.status),
        priority: mapPriority(data.priority),
        purchase_status: truncateText(purchaseStatus, 255),
        construction_status: truncateText(constrStatus, 255),
        issue_summary: issue || '',
        issue_status_text: optionalTruncateText(issueStatus, 255),
        is_done: isDone || false,
        is_section_header: isSectionHeader || false,
        section_name: sectionName || '',
        notes: data.notes || '',
        assigned_engineer_id: cleanUuid(data.assignedEngineerId ?? data.assigned_engineer_id),
        due_date: data.dueDate ? new Date(data.dueDate) : null,
        project_id: projectId,
        parent_id: parentIdClean,
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
    const { projectCode, projectName, purchaseStatus, constrStatus, issue, issueStatus, assignedEngineerName, isDone, isSectionHeader, sectionName, parentId, parent_id, ...data } = req.body;
    
    // Build updateData using ONLY known Prisma task fields (whitelist approach)
    const updateData: any = {};

    // Scalar fields that map 1-to-1 with Prisma schema
    const allowed = ['stt', 'code', 'name', 'volume', 'unit', 'progress', 'notes'];
    allowed.forEach(field => {
      if (data[field] === undefined) return;
      if (field === 'stt') updateData[field] = optionalTruncateText(data[field], 50);
      else if (field === 'code') updateData[field] = truncateText(data[field], 100);
      else if (field === 'unit') updateData[field] = truncateText(data[field], 50);
      else updateData[field] = data[field];
    });

    // Enum fields – convert Vietnamese strings → Prisma enum values
    if (data.status !== undefined) updateData.status = mapStatus(data.status);
    if (data.priority !== undefined) updateData.priority = mapPriority(data.priority);

    // Boolean fields
    if (isDone !== undefined) updateData.is_done = isDone;
    if (isSectionHeader !== undefined) updateData.is_section_header = isSectionHeader;

    // String fields from destructured vars
    if (sectionName !== undefined) updateData.section_name = sectionName;
    if (purchaseStatus !== undefined) updateData.purchase_status = truncateText(purchaseStatus, 255);
    if (constrStatus !== undefined) updateData.construction_status = truncateText(constrStatus, 255);
    if (issue !== undefined) updateData.issue_summary = issue;
    if (issueStatus !== undefined) updateData.issue_status_text = optionalTruncateText(issueStatus, 255);

    // Relation: assigned engineer (frontend may send assignedEngineerId or assigned_engineer_id)
    const engId = cleanUuid(data.assignedEngineerId ?? data.assigned_engineer_id);
    if (data.assignedEngineerId !== undefined || data.assigned_engineer_id !== undefined) updateData.assigned_engineer_id = engId;

    // Date
    if (data.dueDate !== undefined) updateData.due_date = data.dueDate ? new Date(data.dueDate) : null;

    // Parent Id
    const pId = cleanUuid(parentId ?? parent_id);
    if (parentId !== undefined || parent_id !== undefined) updateData.parent_id = pId;

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

