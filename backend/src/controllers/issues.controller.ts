import { Request, Response } from 'express';
import prisma from '../prismaClient';

export const getIssues = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const where = projectId ? { project_id: String(projectId) } : {};
    
    const issues = await prisma.issue.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        project: { select: { name: true, code: true } }
      }
    });

    const formattedIssues = issues.map((i: any) => ({
      id: i.id,
      incidentCode: i.incident_code,
      title: i.title,
      projectName: i.project?.name,
      projectCode: i.project?.code,
      location: i.location,
      reportedBy: i.reported_by_name,
      reportedTime: i.reported_at,
      description: i.description,
      photoUrl: i.photo_url,
      status: i.status === 'processing' ? 'PROCESSING' : i.status === 'resolved' ? 'RESOLVED' : 'OPEN',
      priority: i.priority === 'critical' ? 'CRITICAL' : i.priority === 'warning' ? 'WARNING' : 'STANDARD',
      assignedTo: i.assigned_to_name,
      managerDirectives: i.manager_directives,
      timelineLogs: [] // Need to fetch comments if wanted
    }));

    res.json(formattedIssues);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách vấn đề' });
  }
};

export const createIssue = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const issue = await prisma.issue.create({
      data: {
        project_id: data.projectId,
        incident_code: data.incidentCode || `ISS-${Date.now()}`,
        title: data.title,
        description: data.description,
      },
    });
    res.status(201).json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi tạo vấn đề' });
  }
};
