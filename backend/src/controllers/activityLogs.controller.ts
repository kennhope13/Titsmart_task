import { Request, Response } from 'express';
import prisma from '../prismaClient';

export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.activityLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    const formattedLogs = logs.map((l: any) => ({
      id: l.id,
      user: l.user_name,
      action: l.action,
      project: l.project_name || 'Hệ thống',
      timestamp: l.created_at,
      icon: l.icon || 'history',
      badgeBg: l.badge_bg || 'bg-slate-50',
      iconColor: l.icon_color || 'text-slate-500',
    }));

    res.json(formattedLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách lịch sử hoạt động' });
  }
};

export const createActivityLog = async (req: Request, res: Response) => {
  try {
    const { user, action, project, icon, badgeBg, iconColor } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Thiếu trường action' });
    }

    const log = await prisma.activityLog.create({
      data: {
        user_name: user || 'Kỹ sư Nam',
        action,
        project_name: project || 'Hệ thống',
        icon: icon || 'history',
        badge_bg: badgeBg || 'bg-slate-50',
        icon_color: iconColor || 'text-slate-500',
      },
    });

    res.status(201).json({
      id: log.id,
      user: log.user_name,
      action: log.action,
      project: log.project_name || 'Hệ thống',
      timestamp: log.created_at,
      icon: log.icon || 'history',
      badgeBg: log.badge_bg || 'bg-slate-50',
      iconColor: log.icon_color || 'text-slate-500',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi tạo nhật ký hoạt động' });
  }
};
