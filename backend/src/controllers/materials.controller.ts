import { Request, Response } from 'express';
import prisma from '../prismaClient';

export const getMaterials = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const where = projectId ? { project_id: String(projectId) } : {};
    
    const materials = await prisma.material.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        project: { select: { name: true, code: true } }
      }
    });

    const formattedMaterials = materials.map((m: any) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      englishName: m.english_name,
      projectName: m.project?.name,
      projectCode: m.project?.code,
      volume: Number(m.volume),
      unit: m.unit,
      unitPrice: Number(m.unit_price),
      status: m.status,
      constrStatus: m.construction_status,
      supplier: m.supplier,
    }));

    res.json(formattedMaterials);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách vật tư' });
  }
};

export const createMaterial = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const material = await prisma.material.create({
      data: {
        project_id: data.projectId,
        code: data.code,
        name: data.name,
        english_name: data.englishName,
        volume: data.volume || 0,
        unit: data.unit || 'bộ',
        unit_price: data.unitPrice || 0,
        status: data.status || 'Chưa đặt hàng',
        construction_status: data.constrStatus || 'Chưa thi công',
        supplier: data.supplier,
      },
    });
    res.status(201).json(material);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi tạo vật tư' });
  }
};
