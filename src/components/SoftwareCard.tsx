import React, { useState, useEffect, useRef } from 'react';
import { Download, Star, Image as ImageIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSoftwareDownloadUrl, toggleSoftwareStar } from '../lib/supabase';
import toast from 'react-hot-toast';
import AdModal from './AdModal';
import { supabase } from '../lib/supabase';

interface SoftwareCardProps {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  starCount: number;
  category: string;
  operatingSystem: string;
  onDownload?: () => void;
  currentPageForNav: number;
}

const SoftwareCard: React.FC<SoftwareCardProps> = ({
  id,
  name,
  description,
  iconUrl,
  starCount: initialStarCount,
  category,
  operatingSystem,
  onDownload,
  currentPageForNav,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState(initialStarCount);
  const [isStarring, setIsStarring] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  
  // 卡片动态效果状态
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [transform, setTransform] = useState('');
  const [background, setBackground] = useState('');

  useEffect(() => {
    if (user) {
      checkIfStarred();
    }
  }, [user, id]);

  const checkIfStarred = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_stars')
        .select('id')
        .eq('software_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking star status:', error);
        return;
      }
      
      setIsStarred(!!data);
    } catch (error) {
      // Handle network errors gracefully
      console.error('Error checking star status:', error);
      // Don't show error toast to user since this is a non-critical operation
      setIsStarred(false);
    }
  };

  const handleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }

    if (isStarring) return;
    setIsStarring(true);

    try {
      if (isStarred) {
        const { error } = await toggleSoftwareStar(id, user.id);

        if (error) throw error;
        setStarCount(prev => prev - 1);
        setIsStarred(false);
        toast.success('已取消点赞');
      } else {
        const { error } = await toggleSoftwareStar(id, user.id);

        if (error) throw error;
        setStarCount(prev => prev + 1);
        setIsStarred(true);
        toast.success('感谢您的点赞！');
      }
    } catch (error) {
      console.error('Error toggling star:', error);
      toast.error('操作失败，请稍后重试');
    } finally {
      setIsStarring(false);
    }
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    setIsAdModalOpen(true);
  };

  // 处理鼠标移动，更新卡片效果
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    
    // 计算鼠标在卡片内的相对位置 (0~1)
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setMousePosition({ x, y });
    
    // 计算倾斜角度 (-10~10度)
    const tiltX = (y - 0.5) * 10;
    const tiltY = (0.5 - x) * 10;
    
    // 设置变换效果
    setTransform(`perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`);
    
    // 设置渐变背景色，根据鼠标位置变化
    setBackground(`radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(235, 245, 255, 0.3) 0%, rgba(255, 255, 255, 0) 60%)`);
  };
  
  // 鼠标进入卡片
  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  
  // 鼠标离开卡片
  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setBackground('none');
  };

  return (
    <>
      <div
        ref={cardRef}
        onClick={() => {
          sessionStorage.setItem('homeSoftwareListScroll', window.scrollY.toString());
          sessionStorage.setItem('homeSoftwareCurrentPage', currentPageForNav.toString());
          navigate(`/software/${id}`);
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isHovered ? transform : '',
          background: isHovered ? background : '',
          transition: !isHovered ? 'all 0.5s ease-out' : 'none'
        }}
        className={clsx(
          "group relative bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden",
          "transition-all duration-300 ease-out",
          "hover:shadow-[0_10px_40px_-15px_rgba(0,0,0,0.2)]",
          "active:shadow-[0_5px_15px_-10px_rgba(0,0,0,0.2)]",
          "cursor-pointer border border-white/30",
          isHovered && "z-10"
        )}
      >
        {/* 光晕效果 */}
        {isHovered && (
          <div 
            className="absolute inset-0 z-0 opacity-70 pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, rgba(59, 130, 246, 0.3) 0%, rgba(255, 255, 255, 0) 70%)`,
              mixBlendMode: 'overlay'
            }}
          />
        )}
        
        <div className="p-6 relative z-1">
          <div className="flex items-start gap-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              {!imageError ? (
                <img
                  src={iconUrl}
                  alt={name}
                  className="w-full h-full rounded-xl object-cover"
                  onError={() => setImageError(true)}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-gray-50 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                {category}
              </span>
              {operatingSystem && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700">
                  {operatingSystem}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleStar}
                disabled={isStarring}
                className={clsx(
                  "flex items-center transition-all duration-300",
                  "rounded-full px-3 py-1",
                  "focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2",
                  "transform hover:scale-110 active:scale-95",
                  isStarred ? [
                    "bg-yellow-50",
                    "text-yellow-500",
                  ] : [
                    "text-gray-400",
                    "hover:text-yellow-500",
                  ]
                )}
                aria-label={isStarred ? "取消点赞" : "点赞"}
                aria-pressed={isStarred}
              >
                <Star
                  size={16}
                  className={clsx(
                    "transition-all duration-500 ease-in-out",
                    "group-hover:rotate-[360deg]",
                    "active:rotate-[720deg]",
                    isStarred && "fill-current"
                  )}
                />
                <span className="ml-1 text-sm">{starCount}</span>
              </button>
              
              <button
                onClick={handleDownloadClick}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2",
                  "bg-gradient-to-r from-blue-500 to-blue-600",
                  "text-white rounded-lg",
                  "hover:from-blue-600 hover:to-blue-700",
                  "transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                )}
                aria-label={user ? `下载 ${name}` : "登录后下载"}
              >
                <Download size={16} aria-hidden="true" />
                {user ? '下载' : '登录下载'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <AdModal 
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
        onDownload={onDownload}
      />
    </>
  );
};

export default SoftwareCard;