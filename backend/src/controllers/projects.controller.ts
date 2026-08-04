import { Request, Response } from 'express';
import prisma from '../prismaClient';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cleanUuid = (value: unknown) => (typeof value === 'string' && UUID_RE.test(value) ? value : null);

const mapToPrisma = (data: any) => {
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
    data.client ? `Chủ đầu tư: ${data.client}` : '',
    data.contractValue ? `Giá trị hợp đồng: ${data.contractValue}` : '',
  ].filter(Boolean).join(' | ');
  if (extraNotes) mapped.notes = [mapped.notes, extraNotes].filter(Boolean).join(' | ');

  return mapped;
};

const mapToFrontend = (project: any) => {
  if (!project) return project;
  return {
    ...project,
    managerId: project.manager_id,
    managerName: project.manager_name,
    startDate: project.start_date,
    endDate: project.end_date,
    activeTeams: project.active_teams,
    progressPercent: project.progress_percent,
    totalTasks: project.total_tasks,
    completedTasks: project.completed_tasks,
    issueTasksCount: project.issue_tasks_count,
  };
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        // Loại bỏ project nội bộ dùng cho kho công ty
        NOT: { code: 'COMPANY' },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(projects.map(mapToFrontend));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (project) {
      res.json(mapToFrontend(project));
    } else {
      res.status(404).json({ error: 'Project not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const data = mapToPrisma(req.body);
    const project = await prisma.project.create({
      data,
    });
    res.status(201).json(mapToFrontend(project));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = mapToPrisma(req.body);
    const project = await prisma.project.update({
      where: { id },
      data,
    });
    res.json(mapToFrontend(project));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};
