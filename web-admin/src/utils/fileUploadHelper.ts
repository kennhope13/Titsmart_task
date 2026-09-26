import { supabase } from '../lib/supabase';

/**
 * Nén hình ảnh phía Client bằng HTML5 Canvas để giảm dung lượng file xuống < 300KB-500KB
 * Giúp tải lên cực nhanh qua 3G/4G và tương thích tối đa với Cloud Storage
 */
export async function compressImage(
  file: File | Blob,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve) => {
    // Nếu không phải ảnh (PDF, DOCX, ZIP...) thì trả về nguyên bản
    if (file.type && !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Tính tỉ lệ thu nhỏ nếu vượt quá maxWidth/maxHeight
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Vẽ ảnh lên canvas với kích thước mới
        ctx.drawImage(img, 0, 0, width, height);

        // Xuất ra Blob định dạng image/jpeg chất lượng tối ưu
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(blob);
            } else {
              // Nếu nén không giảm được dung lượng thì giữ nguyên
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        resolve(file);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      resolve(file);
    };

    reader.readAsDataURL(file);
  });
}

export interface UploadResult {
  url: string;
  type: 'image' | 'file';
  name: string;
  size?: number;
}

/**
 * Tải file / ảnh lên Supabase Storage (Bucket 'titsmart-images')
 * Tự động nén ảnh trước khi tải và trả về Public URL chuẩn
 */
export async function uploadAttachment(
  file: File,
  folder = 'task_attachments'
): Promise<UploadResult> {
  const isImage = file.type.startsWith('image/');
  const originalName = file.name || (isImage ? 'image.jpg' : 'document.bin');
  const fileExt = originalName.split('.').pop()?.toLowerCase() || (isImage ? 'jpg' : 'bin');

  try {
    let uploadData: Blob = file;

    // 1. Nén ảnh nếu là hình ảnh
    if (isImage) {
      uploadData = await compressImage(file, 1600, 1600, 0.82);
    }

    // 2. Tạo tên file duy nhất không dấu
    const safeRandom = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now();
    const finalFileName = `${timestamp}_${safeRandom}.${isImage ? 'jpg' : fileExt}`;
    const filePath = `${folder}/${finalFileName}`;

    // 3. Tải lên Supabase Storage bucket 'titsmart-images'
    const { error: uploadError } = await supabase.storage
      .from('titsmart-images')
      .upload(filePath, uploadData, {
        cacheControl: '31536000',
        upsert: true,
        contentType: isImage ? 'image/jpeg' : file.type || 'application/octet-stream'
      });

    if (uploadError) {
      console.warn('[Storage] Supabase Storage upload warning:', uploadError);
      
      // Fallback: nếu lỗi Storage bucket, chuyển ảnh sang base64 siêu nhẹ (< 200KB) để không nghẽn database
      if (isImage) {
        const lightBlob = await compressImage(file, 1000, 1000, 0.65);
        const lightBase64 = await blobToBase64(lightBlob);
        return {
          url: lightBase64,
          type: 'image',
          name: originalName,
          size: lightBlob.size
        };
      }
      
      throw uploadError;
    }

    // 4. Lấy Public URL
    const { data: publicUrlData } = supabase.storage
      .from('titsmart-images')
      .getPublicUrl(filePath);

    return {
      url: publicUrlData.publicUrl,
      type: isImage ? 'image' : 'file',
      name: originalName,
      size: uploadData.size
    };
  } catch (error) {
    console.error('[Storage] Error uploading file to storage:', error);
    // Graceful fallback nếu không kết nối được Storage
    if (isImage) {
      const fallbackBlob = await compressImage(file, 800, 800, 0.6);
      const base64 = await blobToBase64(fallbackBlob);
      return {
        url: base64,
        type: 'image',
        name: originalName
      };
    }
    throw error;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
