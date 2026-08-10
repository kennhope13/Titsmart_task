import React, { useEffect, useRef, useState } from 'react';
import { extractFileData, WebOcrExtractedData, WebOcrProgress } from '../../services/webOcrService';

type OcrUploadPanelProps = {
  onExtracted: (data: WebOcrExtractedData) => void;
  compact?: boolean;
};

const acceptedFileTypes = '.png,.jpg,.jpeg,.webp,.bmp,.xlsx,.xls,.csv,.txt,.tsv,.docx,.pdf,image/*,text/*';

const canPreviewImage = (file: File | null) => !!file && file.type.startsWith('image/');

const normalizePreviewLabel = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0111\u0110]/g, 'd')
    .toLowerCase();

const getPreviewFieldValue = (data: WebOcrExtractedData, labels: string[]) => {
  const normalizedLabels = labels.map(normalizePreviewLabel);
  return data.fields.find((field) => {
    const fieldLabel = normalizePreviewLabel(field.label);
    return normalizedLabels.some((label) => fieldLabel.includes(label));
  })?.value || '';
};

const getPreviewRows = (data: WebOcrExtractedData) => {
  const locationValue = data.location || getPreviewFieldValue(data, [
    'dia diem cong trinh',
    'dia diem xay dung cong trinh',
    'dia diem xay dung',
    'dia diem thi cong',
    'dia diem lap dat',
    'vi tri cong trinh',
    'dia chi cong trinh',
    'dia chi thi cong',
    'dia chi lap dat',
    'dia diem',
    'vi tri',
    'dia chi',
  ]);

  const rows = [
    { label: 'Dự án/Công trình', value: data.projectName },
    { label: 'Địa điểm công trình', value: locationValue },
    { label: 'Công việc', value: data.taskName || data.materialName },
    { label: 'Khối lượng', value: data.quantity },
    { label: 'Đơn vị', value: data.unit },
    { label: 'Hạn/Ngày', value: data.dueDate },
    { label: 'Ghi chú', value: data.note },
    { label: 'Đầu mục trong bảng', value: data.tableTasks?.length ? `${data.tableTasks.length} đầu mục sẽ import vào tab Công việc` : '' },
  ].filter((row) => row.value && row.value.trim());

  const seen = new Set(rows.map((row) => normalizePreviewLabel(row.label)));
  for (const field of data.fields) {
    if (!field.value?.trim()) continue;
    const labelKey = normalizePreviewLabel(field.label);
    if (seen.has(labelKey)) continue;
    seen.add(labelKey);
    rows.push(field);
  }

  return rows.slice(0, 20);
};

export const OcrUploadPanel: React.FC<OcrUploadPanelProps> = ({ onExtracted, compact = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [progress, setProgress] = useState<WebOcrProgress>({ status: '', progress: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'warning' | 'info'; text: string } | null>(null);
  const [extractedPreview, setExtractedPreview] = useState<WebOcrExtractedData | null>(null);

  useEffect(() => {
    if (!canPreviewImage(selectedFile)) {
      setPreviewUrl('');
      return;
    }

    const url = URL.createObjectURL(selectedFile as File);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleFileSelect = (file?: File) => {
    if (!file) return;
    setSelectedFile(file);
    setExtractedPreview(null);
    setProgress({ status: '', progress: 0 });
    setMessage(null);
  };

  const runExtraction = async () => {
    if (!selectedFile) {
      setMessage({ type: 'warning', text: 'Chọn một file phụ lục trước khi trích xuất dữ liệu.' });
      return;
    }

    setIsProcessing(true);
    setExtractedPreview(null);
    setMessage({ type: 'info', text: 'Đang đọc phụ lục. OCR chỉ chạy với ảnh hoặc PDF scan.' });

    try {
      const result = await extractFileData(selectedFile, setProgress);
      if (!result.text.trim()) {
        setMessage({ type: 'warning', text: 'Không tìm thấy dữ liệu rõ ràng trong file này.' });
        return;
      }

      setExtractedPreview(result.extracted);
      // Tự động điền dữ liệu vào form sau khi đọc file xong
      onExtracted(result.extracted);
      setMessage({ type: 'success', text: 'Đã tự động điền dữ liệu vào form. Có thể chỉnh lại từng ô trước khi lưu.' });
    } catch (error: any) {
      setMessage({ type: 'warning', text: error?.message || 'Không thể trích xuất dữ liệu từ file này.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setExtractedPreview(null);
    setProgress({ status: '', progress: 0 });
    setMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const previewRows = extractedPreview ? getPreviewRows(extractedPreview) : [];

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-extrabold text-primary">
            <span className="material-symbols-outlined text-base">upload_file</span>
            Nhập từ phụ lục
          </div>
          <p className="mt-1 text-slate-600">Tải ảnh, Excel/CSV, TXT, DOCX hoặc PDF. OCR chỉ dùng cho ảnh và PDF scan; các file có text sẽ được đọc trực tiếp.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-9 w-28 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 font-bold text-primary hover:bg-blue-50"
          >
            <span className="material-symbols-outlined text-sm">attach_file</span>
            Chon file
          </button>
          <button
            type="button"
            onClick={runExtraction}
            disabled={isProcessing || !selectedFile}
            className="inline-flex h-9 w-28 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">auto_fix_high</span>
            {isProcessing ? 'Dang doc...' : 'Doc file'}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes}
        className="hidden"
        onChange={(event) => handleFileSelect(event.target.files?.[0])}
      />

      <div
        className="mt-3 rounded-lg border border-dashed border-blue-200 bg-white/70 p-3"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFileSelect(event.dataTransfer.files?.[0]);
        }}
      >
        {selectedFile ? (
          <div className="flex gap-3">
            {previewUrl ? (
              <img src={previewUrl} alt="Phụ lục đã chọn" className={`${compact ? 'h-16 w-20' : 'h-24 w-32'} rounded-md object-cover`} />
            ) : (
              <div className={`${compact ? 'h-16 w-20' : 'h-24 w-32'} flex items-center justify-center rounded-md bg-slate-100 text-slate-400`}>
                <span className="material-symbols-outlined text-3xl">description</span>
              </div>
            )}
            <div className="min-w-0 flex-1 py-1">
              <p className="truncate font-bold text-slate-800">{selectedFile.name}</p>
              <p className="mt-1 text-slate-500">{Math.round(selectedFile.size / 1024)} KB</p>
              {isProcessing && (
                <div className="mt-2">
                  <div className="flex justify-between text-[11px] font-bold text-blue-700">
                    <span>{progress.status || 'Đang xử lý phụ lục'}</span>
                    <span>{progress.progress}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-blue-100">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(5, progress.progress)}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-4 text-center font-semibold text-slate-500">
            <span className="material-symbols-outlined text-lg text-slate-400">drive_folder_upload</span>
            Kéo thả phụ lục vào đây hoặc bấm Chọn phụ lục
          </div>
        )}
      </div>

      {extractedPreview && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-extrabold text-slate-800">Dữ liệu đã nhận diện và tự động điền vào form</p>
              <p className="mt-0.5 text-slate-500">Có thể chỉnh lại từng ô trong form, hoặc chọn lại file nếu muốn thay đổi nguồn dữ liệu.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={resetSelection} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold text-slate-600 hover:bg-slate-50">
                <span className="material-symbols-outlined text-sm">refresh</span>
                Chọn lại
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {previewRows.map((row) => (
              <div key={row.label} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase text-slate-400">{row.label}</p>
                <p className="mt-1 line-clamp-2 font-semibold text-slate-800">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div className={`mt-3 rounded-lg border px-3 py-2 font-semibold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : message.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};
