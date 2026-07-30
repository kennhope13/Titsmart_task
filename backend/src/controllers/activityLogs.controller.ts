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
