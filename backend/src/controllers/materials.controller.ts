import { Request, Response } from 'express';
import prisma from '../prismaClient';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

const toNumber = (value: unknown) => Number(value || 0);

const formatMaterial = (m: any) => ({
  id: m.id,
  code: m.code,
  name: m.name,
  englishName: m.english_name,
  projectName: m.project?.name,
  projectCode: m.project?.code,
  volume: toNumber(m.volume),
  unit: m.unit,
  unitPrice: toNumber(m.unit_price),
  status: m.status,
  constrStatus: m.construction_status,
  supplier: m.supplier,
  initialStock: toNumber(m.initial_stock),
  currentStock: toNumber(m.current_stock),
  totalImport: toNumber(m.total_import),
  totalExport: toNumber(m.total_export),
  category: m.category || '',
  specs: m.specs || '',
  notes: m.notes || '',
});

const formatInventoryTransaction = (tx: any) => ({
  id: tx.id,
  type: tx.type === 'import' ? 'IMPORT' : 'EXPORT',
  date: tx.transaction_date instanceof Date
    ? tx.transaction_date.toISOString().split('T')[0]
    : String(tx.transaction_date || ''),
  materialId: tx.material_id,
  materialCode: tx.material?.code || '',
  materialName: tx.material?.name || '',
  specs: tx.material?.specs || tx.material?.english_name || '',
  category: tx.material?.category || '',
  unit: tx.material?.unit || '',
  quantity: toNumber(tx.quantity),
  sourceOrProject: tx.source_or_project || '',
  receiverName: tx.receiver_name || '',
  notes: tx.notes || '',
  createdAt: tx.created_at instanceof Date ? tx.created_at.toISOString() : String(tx.created_at || ''),
});

const getOrCreateCompanyProject = async (client: any) => {
  const existing = await client.project.findUnique({ where: { code: 'COMPANY' } });
  if (existing) return existing;

  return client.project.create({
    data: {
      code: 'COMPANY',
      name: 'Kho Công Ty',
      location: 'Kho Công Ty',
      manager_name: 'Hệ thống',
    },
  });
};

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

    res.json(materials.map(formatMaterial));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách vật tư' });
  }
};

export const createMaterial = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const companyProject = data.projectId
      ? null
      : await getOrCreateCompanyProject(prisma);
    const material = await prisma.material.create({
      data: {
        project_id: data.projectId || companyProject.id,
        code: data.code,
        name: data.name,
        english_name: data.englishName,
        volume: data.volume || 0,
        unit: data.unit || 'Cái',
        unit_price: data.unitPrice || 0,
        status: data.status || 'Chưa đặt hàng',
        construction_status: data.constrStatus || 'Chưa thi công',
        supplier: data.supplier,
        initial_stock: data.initialStock || 0,
        current_stock: data.currentStock ?? data.initialStock ?? 0,
        total_import: data.totalImport || 0,
        total_export: data.totalExport || 0,
        category: data.category || '',
        specs: data.specs || data.englishName || '',
        notes: data.notes || '',
      },
      include: { project: true },
    });
    res.status(201).json(formatMaterial(material));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi tạo vật tư' });
  }
};

export const getInventoryTransactions = async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      orderBy: { created_at: 'desc' },
      include: { material: true },
    });

    res.json(transactions.map(formatInventoryTransaction));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi lấy nhật ký kho' });
  }
};

export const createInventoryTransaction = async (req: Request, res: Response) => {
  try {
    const data = req.body || {};
    const quantity = Number(data.quantity || 0);
    const type = data.type === 'EXPORT' ? 'export' : 'import';

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Số lượng nhập/xuất phải lớn hơn 0' });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      let material = null;

      if (data.materialId && UUID_RE.test(String(data.materialId))) {
        material = await tx.material.findUnique({
          where: { id: String(data.materialId) },
          include: { project: true },
        });
      }

      if (!material && data.materialCode) {
        material = await tx.material.findUnique({
          where: { code: String(data.materialCode) },
          include: { project: true },
        });
      }

      if (!material) {
        const companyProject = await getOrCreateCompanyProject(tx);
        // Lấy initialStock từ request để tính tồn kho chính xác ngay từ lần nhập đầu tiên
        const initialStock = Number(data.initialStock || 0);
        material = await tx.material.create({
          data: {
            project_id: companyProject.id,
            code: data.materialCode || `MAT-${Date.now()}`,
            name: data.materialName || 'Vật tư chưa đăng ký',
            english_name: data.specs || '',
            volume: Number(data.volume || 0),
            unit: data.unit || 'Cái',
            unit_price: Number(data.unitPrice || 0),
            status: 'Đã có hàng',
            construction_status: 'Chưa thi công',
            supplier: data.supplier || '',
            initial_stock: initialStock,
            current_stock: initialStock,
            total_import: 0,
            total_export: 0,
            category: data.category || '',
            specs: data.specs || '',
            notes: '',
          },
          include: { project: true },
        });
      }

      const updatedMaterial = await tx.material.update({
        where: { id: material.id },
        data: {
          // Dùng increment atomic để tránh race condition read-then-write
          ...(type === 'import' ? { total_import: { increment: quantity } } : {}),
          ...(type === 'export' ? { total_export: { increment: quantity } } : {}),
          updated_at: new Date(),
        },
        include: { project: true },
      });

      // Tính current_stock từ giá trị thực tế sau khi update
      const finalCurrentStock = Number(updatedMaterial.initial_stock || 0)
        + Number(updatedMaterial.total_import || 0)
        - Number(updatedMaterial.total_export || 0);

      const materialWithStock = await tx.material.update({
        where: { id: updatedMaterial.id },
        data: { current_stock: finalCurrentStock },
        include: { project: true },
      });

      const transaction = await tx.inventoryTransaction.create({
        data: {
          material_id: updatedMaterial.id,
          project_id: null,
          type,
          transaction_date: data.date ? new Date(data.date) : new Date(),
          quantity,
          source_or_project: data.sourceOrProject || '',
          receiver_name: type === 'export' ? data.receiverName || '' : '',
          notes: data.notes || '',
        },
        include: { material: true },
      });

      return {
        material: formatMaterial(materialWithStock),
        transaction: formatInventoryTransaction(transaction),
      };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi tạo giao dịch kho' });
  }
};
