import type { Request, Response } from 'express';
import prisma from '../prismaClient';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

const formatEngineer = (e: any) => ({
  id: e.id,
  name: e.full_name,
  title: e.title || 'Kỹ sư',
  avatar: e.avatar_url || DEFAULT_AVATAR,
  phone: e.phone || '',
  email: e.email || '',
  managedProjects: Array.isArray(e.projects_managed)
    ? e.projects_managed.map((p: any) => ({ code: p.code, name: p.name }))
    : [],
  memberProjects: Array.isArray(e.project_memberships)
    ? e.project_memberships
        .map((membership: any) => membership.project)
        .filter(Boolean)
        .map((p: any) => ({ code: p.code, name: p.name }))
    : [],
});

export const getEngineers = async (_req: Request, res: Response) => {
  try {
    const engineers = await prisma.user.findMany({
      where: { role: 'engineer' },
      orderBy: { created_at: 'desc' },
      include: {
        projects_managed: { select: { code: true, name: true } },
        project_memberships: { include: { project: { select: { code: true, name: true } } } },
      },
    });
    res.json(engineers.map(formatEngineer));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách kỹ sư' });
  }
};

export const createEngineer = async (req: Request, res: Response) => {
  try {
    const { fullName, phone, email, title, projectCodes } = req.body;
    const name = String(fullName || '').trim();
    if (!name) return res.status(400).json({ error: 'Thiếu họ tên' });

    // Email là trường unique bắt buộc trong schema → tự sinh nếu không cung cấp
    const safeEmail = email && String(email).trim()
      ? String(email).trim().toLowerCase()
      : `eng-${Date.now()}@titsmart.local`;

    const codes: string[] = Array.isArray(projectCodes) ? projectCodes.map(String) : [];

    const user = await prisma.user.create({
      data: {
        full_name: name,
        email: safeEmail,
        phone: phone ? String(phone) : null,
        title: title ? String(title) : 'Kỹ sư',
        role: 'engineer',
      },
    });

    if (codes.length > 0) {
      const projects = await prisma.project.findMany({
        where: { code: { in: codes } },
        select: { id: true },
      });
      if (projects.length > 0) {
        await prisma.projectMember.createMany({
          data: projects.map((project) => ({
            user_id: user.id,
            project_id: project.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    const created = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        projects_managed: { select: { code: true, name: true } },
        project_memberships: { include: { project: { select: { code: true, name: true } } } },
      },
    });

    res.status(201).json(formatEngineer(created));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi tạo nhân sự' });
  }
};
