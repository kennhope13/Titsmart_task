import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../prismaClient';

// ── Upload ảnh hiện trường ────────────────────────────────────────────────────

const UPLOAD_DIR = path.resolve(__dirname, '../../../storage/uploads/field-logs');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

export const uploadFieldImages = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB / ảnh
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Chỉ chấp nhận file ảnh'));
    }
    cb(null, true);
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatLog = (log: any) => ({
  id: log.id,
  projectCode: log.project?.code,
  note: log.note || '',
  images: Array.isArray(log.images) ? log.images : [],
  timestamp: log.created_at,
});

const deleteImageFiles = (images: unknown) => {
  if (!Array.isArray(images)) return;
  for (const url of images) {
    if (typeof url !== 'string') continue;
    const filePath = path.resolve(UPLOAD_DIR, path.basename(url));
    fs.unlink(filePath, () => { /* ignore */ });
  }
};

// ── Controllers ───────────────────────────────────────────────────────────────

export const getFieldLogs = async (req: Request, res: Response) => {
  try {
    const { projectCode } = req.query;
    const where = projectCode ? { project: { code: String(projectCode) } } : {};
    const logs = await prisma.fieldLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: { project: { select: { code: true, name: true } } },
    });
    res.json(logs.map(formatLog));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi lấy nhật ký hiện trường' });
  }
};

export const createFieldLog = async (req: Request, res: Response) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    const { projectCode, note } = req.body;
    if (!projectCode) return res.status(400).json({ error: 'Thiếu projectCode' });

    const project = await prisma.project.findUnique({ where: { code: String(projectCode) } });
    if (!project) return res.status(400).json({ error: 'Dự án không tồn tại' });

    const images = files.map(f => `/uploads/field-logs/${f.filename}`);
    const log = await prisma.fieldLog.create({
      data: {
        project_id: project.id,
        note: note || '',
        images,
      },
      include: { project: { select: { code: true, name: true } } },
    });
    res.status(201).json(formatLog(log));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi lưu nhật ký hiện trường' });
  }
};

export const deleteFieldLog = async (req: Request, res: Response) => {
  try {
    const log = await prisma.fieldLog.findUnique({ where: { id: req.params.id } });
    if (!log) return res.status(404).json({ error: 'Không tìm thấy nhật ký' });
    deleteImageFiles(log.images);
    await prisma.fieldLog.delete({ where: { id: log.id } });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi xóa nhật ký hiện trường' });
  }
};


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

    const newImages = files.map(f => `/uploads/field-logs/${f.filename}`);
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
