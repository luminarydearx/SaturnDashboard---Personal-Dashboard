'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { MdUpload, MdContentCopy, MdDelete, MdCheck, MdImage } from 'react-icons/md';
import { useToast } from './Toast';

const CLOUD_NAME = 'dg3awuzug';
const UPLOAD_PRESET = 'ml_default';

interface UploadedImage {
  url: string;
  publicId: string;
  uploadedAt: string;
}

interface ImageUploaderProps {
  onUpload?: (url: string) => void;
  multiple?: boolean;
  className?: string;
  label?: string;
  recentKey?: string; // localStorage key for recent uploads
}

export default function ImageUploader({
  onUpload, multiple = false, className = '', label = 'Upload Image', recentKey = 'saturn_recent_uploads'
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [recent, setRecent] = useState<UploadedImage[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(recentKey) || '[]'); } catch { return []; }
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url);
        } else {
          resolve(null);
        }
      });
      xhr.addEventListener('error', () => resolve(null));
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
      xhr.send(formData);
    });
  };

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    setProgress(0);

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toastError('Only image files are allowed');
        continue;
      }
      const url = await uploadFile(file);
      if (url) {
        const entry: UploadedImage = { url, publicId: url.split('/').pop() || '', uploadedAt: new Date().toISOString() };
        setRecent((prev) => {
          const updated = [entry, ...prev].slice(0, 10);
          try { localStorage.setItem(recentKey, JSON.stringify(updated)); } catch {}
          return updated;
        });
        onUpload?.(url);
        success('Image uploaded successfully!');
      } else {
        toastError('Upload failed. Please try again.');
      }
    }

    setUploading(false);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !uploading && fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
          ${uploading ? 'border-violet-500/50 bg-violet-500/5' : 'border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5'}`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <MdUpload size={32} className={`mx-auto mb-3 ${uploading ? 'text-violet-400 animate-bounce' : 'text-slate-500'}`} />
        <p className="text-slate-400 font-nunito text-sm">
          {uploading ? `Uploading... ${progress}%` : label}
        </p>
        <p className="text-slate-600 text-xs mt-1">Drag & drop or click to browse</p>

        {/* Progress bar */}
        {uploading && (
          <div className="mt-4 progress-bar max-w-xs mx-auto">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* Recent uploads */}
      {recent.length > 0 && (
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">
            Recent Uploads ({recent.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recent.map((img, i) => (
              <div key={i} className="group relative glass border border-white/8 rounded-xl overflow-hidden">
                <div className="relative aspect-video">
                  <Image src={img.url} alt="Upload" fill className="object-cover" sizes="200px" />
                </div>
                <div className="p-2 space-y-1">
                  <p className="text-slate-500 text-[10px] font-mono truncate">{img.url.split('/').pop()}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => copyUrl(img.url)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded-lg
                        bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                      {copied === img.url ? <MdCheck size={14} className="text-emerald-400" /> : <MdContentCopy size={14} />}
                      {copied === img.url ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => onUpload?.(img.url)}
                      className="flex items-center justify-center p-1 rounded-lg bg-violet-500/10
                        hover:bg-violet-500/20 text-violet-400 transition-colors"
                    >
                      <MdImage size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
