'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

interface ImageModalProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageModal({ src, alt, isOpen, onClose }: ImageModalProps) {
  // Empêcher le défilement quand la modale est ouverte
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-8 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10"
        title="Fermer"
      >
        <X className="w-8 h-8" />
      </button>

      <div 
        className="relative w-full h-full max-w-5xl flex items-center justify-center animate-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full h-full">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-contain"
            priority
            sizes="100vw"
          />
        </div>
      </div>
      
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <span className="text-white/60 text-sm font-medium px-4 py-2 bg-black/40 rounded-full backdrop-blur-md">
          {alt}
        </span>
      </div>
    </div>
  );
}
