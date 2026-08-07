import type { Request, Response } from 'express';
import prisma from '../prismaClient';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

const formatEngineer = (e: any) => ({
  id: e.id,
  code: e.code,
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

const removeVietnameseTones = (str: string) => {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str;
};

const generateCode = (name: string) => `NVTSM-${removeVietnameseTones(name).toUpperCase().replace(/\s+/g, '')}`;

const parseProjectCodes = (projectCodes: unknown) => (
  Array.isArray(projectCodes)
    ? Array.from(new Set(projectCodes.map((value: unknown) => String(value || '').trim()).filter(Boolean)))
    : []
);

const includeEngineerProjects = {
  projects_managed: { select: { code: true, name: true } },
  project_memberships: { include: { project: { select: { code: true, name: true } } } },
} as const;

const loadProjectsByCodes = async (codes: string[]) => {
  const projects = await prisma.project.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true },
  });

  if (projects.length !== codes.length) {
    return null;
  }

  return projects;
};

export const getEngineers = async (_req: Request, res: Response) => {
  try {
    const engineers = await prisma.user.findMany({
      where: { role: 'engineer' },
      orderBy: { created_at: 'desc' },
      include: includeEngineerProjects,
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

    const codes = parseProjectCodes(projectCodes);
    let projects: { id: string; code: string; }[] | null = [];
    if (codes.length > 0) {
      projects = await loadProjectsByCodes(codes);
      if (!projects) {
        return res.status(400).json({ error: 'Có dự án không hợp lệ hoặc đã bị xóa, vui lòng tải lại danh sách dự án' });
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      let uniqueCode = generateCode(name);
      let isUnique = false;
      let counter = 1;
      while (!isUnique) {
        const existing = await tx.user.findUnique({ where: { code: uniqueCode } });
        if (!existing) {
          isUnique = true;
        } else {
          uniqueCode = `${generateCode(name)}${counter}`;
          counter++;
        }
      }

      const user = await tx.user.create({
        data: {
          code: uniqueCode,
          full_name: name,
          email: safeEmail,
          phone: phone ? String(phone) : null,
          title: title ? String(title) : 'Kỹ sư',
          role: 'engineer',
        },
      });

      await tx.projectMember.createMany({
        data: projects.map((project) => ({
          user_id: user.id,
          project_id: project.id,
        })),
        skipDuplicates: true,
      });

      return tx.user.findUnique({
        where: { id: user.id },
        include: includeEngineerProjects,
      });
    });

    res.status(201).json(formatEngineer(created));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi tạo nhân sự' });
  }
};

export const updateEngineer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, phone, title, projectCodes } = req.body;
    const name = String(fullName || '').trim();

    if (!id) return res.status(400).json({ error: 'Thiếu mã nhân sự' });
    if (!name) return res.status(400).json({ error: 'Thiếu họ tên' });

    const codes = parseProjectCodes(projectCodes);
    let projects: { id: string; code: string; }[] | null = [];
    if (codes.length > 0) {
      projects = await loadProjectsByCodes(codes);
      if (!projects) {
        return res.status(400).json({ error: 'Có dự án không hợp lệ hoặc đã bị xóa, vui lòng tải lại danh sách dự án' });
      }
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!existing || existing.role !== 'engineer') {
      return res.status(404).json({ error: 'Không tìm thấy nhân sự cần cập nhật' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          full_name: name,
          phone: phone ? String(phone) : null,
          title: title ? String(title) : 'Kỹ sư',
          updated_at: new Date(),
        },
      });

      await tx.projectMember.deleteMany({
        where: { user_id: id },
      });

      await tx.projectMember.createMany({
        data: projects.map((project) => ({
          user_id: id,
          project_id: project.id,
        })),
        skipDuplicates: true,
      });

      return tx.user.findUnique({
        where: { id },
        include: includeEngineerProjects,
      });
    });

    res.json(formatEngineer(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi cập nhật nhân sự' });
  }
};

export const deleteEngineer = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!existing || existing.role !== 'engineer') {
      return res.status(404).json({ error: 'Không tìm thấy nhân sự cần xóa' });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Đã xóa nhân sự' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi xóa nhân sự' });
  }
};
