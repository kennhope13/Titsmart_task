import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface FileUploadProps {
  label: string;
  name?: string;
  value?: string | string[];
  onChange?: (urls: string | string[]) => void;
  className?: string;
  multiple?: boolean;
  onUploadStateChange?: (isUploading: boolean) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, name, value: initialValue, onChange, className = '', multiple = false, onUploadStateChange }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  
  // Normalize initialValue to array for internal state
  const getInitialArray = () => {
    if (!initialValue) return [];
    if (Array.isArray(initialValue)) return initialValue;
    return [initialValue];
  };
  
  const [localValues, setLocalValues] = useState<string[]>(getInitialArray());

  React.useEffect(() => {
    setLocalValues(getInitialArray());
  }, [initialValue]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      setError('');
      setIsUploading(true);
      if (onUploadStateChange) onUploadStateChange(true);
      
      const newUrls: string[] = [];
      const filesToUpload = multiple ? Array.from(event.target.files) : [event.target.files[0]];
      
      for (const file of filesToUpload) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `documents/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('titsmart-images')
          .upload(filePath, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          setError(`Lỗi tải file. Vui lòng đảm bảo đã tạo Bucket "titsmart-images" và bật Public.`);
          continue;
        }

        const { data } = supabase.storage
          .from('titsmart-images')
          .getPublicUrl(filePath);
          
        newUrls.push(data.publicUrl);
      }
      
      const updatedValues = multiple ? [...localValues, ...newUrls] : [newUrls[0]];
      setLocalValues(updatedValues);
      
      if (onChange) {
        if (multiple) {
          onChange(updatedValues);
        } else {
          onChange(newUrls[0]);
        }
      }
    } catch (error) {
      console.error('Lỗi khi tải file:', error);
      setError('Đã xảy ra lỗi khi tải file lên.');
    } finally {
      setIsUploading(false);
      if (onUploadStateChange) onUploadStateChange(false);
    }
  };

  const handleRemove = (indexToRemove: number) => {
    const newValues = localValues.filter((_, idx) => idx !== indexToRemove);
    setLocalValues(newValues);
    if (onChange) {
      onChange(multiple ? newValues : newValues[0] || '');
    }
  };

  return (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
      {name && <input type="hidden" name={name} value={multiple ? localValues.join(',') : localValues[0] || ''} />}
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <label className={`cursor-pointer relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-semibold text-sm rounded-lg hover:bg-primary/20 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span className="material-symbols-outlined text-[18px]">upload</span>
            Tải lên tệp
            <input 
              type="file" 
              accept="*/*"
              multiple={multiple}
              onChange={handleUpload}
              disabled={isUploading}
              className="absolute inset-0 w-[200%] h-[200%] -top-[50%] -left-[50%] opacity-0 cursor-pointer"
            />
          </label>
        </div>
        
        {localValues.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {localValues.map((url, idx) => {
              const isImage = url.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp|svg)$/i);
              return (
                <div key={idx} className="relative group shrink-0 w-16 h-16 rounded border bg-slate-100 overflow-hidden flex items-center justify-center">
                  <a href={url} target="_blank" rel="noreferrer" className="block w-full h-full">
                    {isImage ? (
                      <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover group-hover:opacity-60 transition-opacity" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-primary bg-white group-hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined text-2xl">description</span>
                        <span className="text-[8px] font-bold mt-1 text-center line-clamp-1 w-full px-1">Tệp đính kèm</span>
                      </div>
                    )}
                  </a>
                  <button 
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="absolute top-0.5 right-0.5 bg-white rounded-full p-0.5 shadow-sm text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                    title="Xóa tệp"
                  >
                    <span className="material-symbols-outlined text-[14px] block">close</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {isUploading && <p className="text-xs text-blue-600 mt-1">Đang tải tệp lên...</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};
