const fs = require('fs');

// 1. Routes
let routes = fs.readFileSync('backend/src/routes/fieldLogs.routes.ts', 'utf8');
routes = routes.replace('uploadFieldImages }', 'uploadFieldImages, updateFieldLog }');
routes = routes.replace('router.delete', 'router.put(\'/:id\', uploadFieldImages.array(\'images\', 20), updateFieldLog);\nrouter.delete');
fs.writeFileSync('backend/src/routes/fieldLogs.routes.ts', routes);

// 2. Controller
let ctrl = fs.readFileSync('backend/src/controllers/fieldLogs.controller.ts', 'utf8');
const updateFunc = `
export const updateFieldLog = async (req: Request, res: Response) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    const { note, existingImages } = req.body;
    
    const log = await prisma.fieldLog.findUnique({ where: { id: req.params.id } });
    if (!log) return res.status(404).json({ error: 'Không tìm thấy nhật ký' });

    let keepImages: string[] = [];
    if (existingImages) {
      keepImages = Array.isArray(existingImages) ? existingImages : [existingImages];
    }

    const oldImages = Array.isArray(log.images) ? (log.images as string[]) : [];
    const deletedImages = oldImages.filter(img => !keepImages.includes(img));
    deleteImageFiles(deletedImages);

    const newImages = files.map(f => \`/uploads/field-logs/\${f.filename}\`);
    const finalImages = [...keepImages, ...newImages];

    const updated = await prisma.fieldLog.update({
      where: { id: log.id },
      data: {
        note: note !== undefined ? note : log.note,
        images: finalImages,
      },
      include: { project: { select: { code: true, name: true } } },
    });
    res.json(formatLog(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi cập nhật nhật ký hiện trường' });
  }
};
`;
fs.writeFileSync('backend/src/controllers/fieldLogs.controller.ts', ctrl + '\n' + updateFunc);
console.log('Backend updated');
