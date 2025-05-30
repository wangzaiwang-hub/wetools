import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react'; // 假设你使用了lucide-react图标

interface ImageLightboxProps {
  isOpen: boolean;
  screenshots: string[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  altText?: string;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ 
  isOpen, 
  screenshots, 
  currentIndex, 
  onClose, 
  onPrev, 
  onNext, 
  altText = 'Enlarged view'
}) => {
  if (!isOpen || currentIndex < 0 || currentIndex >= screenshots.length) {
    return null;
  }

  const imageUrl = screenshots[currentIndex];

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-85 backdrop-blur-md p-4 transition-opacity duration-300"
      onClick={onClose} // 点击背景关闭
    >
      {/* 上一张按钮 */}
      {screenshots.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-[110] bg-white/20 hover:bg-white/40 text-white rounded-full p-3 transition-colors"
          aria-label="Previous image"
        >
          <ArrowLeft size={24} />
        </button>
      )}

      {/* 图片容器 */}
      <div 
        className="relative max-w-full max-h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()} // 防止点击图片本身时关闭模态框
      >
        <img 
          src={imageUrl} 
          alt={altText} 
          className="block max-w-[90vw] max-h-[85vh] md:max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
      </div>

      {/* 下一张按钮 */}
      {screenshots.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-[110] bg-white/20 hover:bg-white/40 text-white rounded-full p-3 transition-colors"
          aria-label="Next image"
        >
          <ArrowRight size={24} />
        </button>
      )}

      {/* 关闭按钮 (右上角) */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-[110] bg-white/20 hover:bg-white/40 text-white rounded-full p-2 md:p-3 transition-colors"
        aria-label="Close image lightbox"
      >
        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  );
};

export default ImageLightbox; 