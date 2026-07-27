import { Request, Response } from 'express';
import prisma from '../prismaClient';

export const getEngineers = async (req: Request, res: Response) => {
  try {
    const engineers = await prisma.user.findMany({
      where: { role: 'engineer' },
      orderBy: { created_at: 'desc' },
    });

    const formattedEngineers = engineers.map((e: any) => ({
      id: e.id,
      name: e.full_name,
      title: e.title,
      avatar: e.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      phone: e.phone,
      email: e.email,
    }));

    res.json(formattedEngineers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách kỹ sư' });
  }
};
