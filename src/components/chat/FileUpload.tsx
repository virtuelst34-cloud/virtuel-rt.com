import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
}

export default function FileUpload({ onFileSelect, maxSize = 5, acceptedTypes = ['image/*', '.pdf', '.doc', '.docx'] }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSelectFile(file);
    }
  }, [maxSize, acceptedTypes]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSelectFile(file);
    }
  }, [maxSize, acceptedTypes]);

  const validateAndSelectFile = (file: File) => {
    setError(null);
    
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${maxSize}MB)`);
      return;
    }

    // Check file type
    const isAccepted = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.name.endsWith(type);
    });

    if (!isAccepted) {
      setError('Type de fichier non accepté');
      return;
    }

    // Create preview for images (blob URL, pas base64)
    if (file.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }

    onFileSelect(file);
  };

  const clearFile = () => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept={acceptedTypes.join(',')}
        className="hidden"
      />
      
      {!preview && !error && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
        >
          <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Glissez-déposez ou cliquez pour uploader
          </p>
          <p className="text-[10px] text-muted-foreground/50 mt-1">
            Max {maxSize}MB • {acceptedTypes.join(', ')}
          </p>
        </div>
      )}

      {preview && (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
          <button
            onClick={clearFile}
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <FileText className="w-4 h-4 text-red-400" />
          <p className="text-xs text-red-400">{error}</p>
          <button onClick={clearFile} className="ml-auto">
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}
    </div>
  );
}
