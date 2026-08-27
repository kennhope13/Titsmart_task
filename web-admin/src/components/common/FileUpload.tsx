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
      
      const formData = new FormData();
      const filesToUpload = multiple ? Array.from(event.target.files) : [event.target.files[0]];
      
      for (const file of filesToUpload) {
        formData.append('files', file);
      }

      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed with status ' + response.status);
      }

      const data = await response.json();
      const newUrls: string[] = data.urls || [];
      
      const updatedValues = multiple ? [...localValues, ...newUrls] : [newUrls[0]];
      setLocalValues(updatedValues);
      setError('');
      
      if (onChange) {
        if (multiple) {
          onChange(updatedValues);
        } else {
          onChange(newUrls[0]);
        }
      }
    } catch (error) {
      console.error('Lỗi khi tải file:', error);
      setError('Đã xảy ra lỗi khi tải file lên. Vui lòng kiểm tra lại kết nối.');
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
          <input 
            type="file" 
            accept="*/*"
            multiple={multiple}
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
