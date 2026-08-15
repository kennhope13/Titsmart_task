import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface ImageUploadProps {
  label: string;
  name?: string;
  value?: string;
  onChange?: (url: string) => void;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ label, name, value: initialValue, onChange, className = '' }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [localValue, setLocalValue] = useState(initialValue || '');

  // Synchronize external value changes if provided
  React.useEffect(() => {
    if (initialValue !== undefined) {
      setLocalValue(initialValue);
    }
  }, [initialValue]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if bucket exists, we assume 'titsmart-images' bucket is created in Supabase
    setIsUploading(true);
    setError('');
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `cccd/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('titsmart-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('titsmart-images')
        .getPublicUrl(filePath);

      setLocalValue(data.publicUrl);
      if (onChange) onChange(data.publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError('Lỗi tải ảnh. Vui lòng đảm bảo bạn đã tạo Storage Bucket tên "titsmart-images" trên Supabase và bật Public.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
      {name && <input type="hidden" name={name} value={localValue} />}
      <div className="flex items-center gap-3">
        {localValue && (
          <a href={localValue} target="_blank" rel="noreferrer" className="shrink-0 w-12 h-12 rounded border bg-slate-100 flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity">
            <img src={localValue} alt="Preview" className="w-full h-full object-cover" />
          </a>
        )}
        <div className="flex-1">
          <input 
            type="file" 
            accept="image/*"
            onChange={handleUpload}
            disabled={isUploading}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-primary/10 file:text-primary
              hover:file:bg-primary/20
              disabled:opacity-50 cursor-pointer"
          />
        </div>
      </div>
      {isUploading && <p className="text-xs text-blue-600 mt-1">Đang tải ảnh lên...</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};
