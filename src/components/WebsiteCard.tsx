import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, Image as ImageIcon, Star } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface WebsiteCardProps {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  category: string;
  url: string;
  starCount: number;
  initialIsStarred?: boolean;
  currentPageForNav?: number;
}

const WebsiteCard: React.FC<WebsiteCardProps> = ({
  id,
  name,
  description,
  iconUrl,
  category,
  url,
  starCount: initialStarCountFromProps,
  initialIsStarred = false,
  currentPageForNav,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [imageError, setImageError] = useState(false);
  
  const [currentStarCount, setCurrentStarCount] = useState(initialStarCountFromProps);
  const [isStarred, setIsStarred] = useState(initialIsStarred);
  const [isStarring, setIsStarring] = useState(false);
  
  // 卡片动态效果状态
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [transform, setTransform] = useState('');
  const [background, setBackground] = useState('');

  useEffect(() => {
    if (user && id) {
      checkIfStarred();
    }
    setCurrentStarCount(initialStarCountFromProps);
    setIsStarred(initialIsStarred === true && !!user);
  }, [user, id, initialStarCountFromProps, initialIsStarred]);

  const checkIfStarred = async () => {
    if (!user || !id) {
      setIsStarred(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('website_stars')
        .select('id')
        .eq('user_id', user.id)
        .eq('website_id', id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking website star status:', error);
        setIsStarred(false);
        return;
      }
      setIsStarred(!!data);
    } catch (err) {
      console.error('Network error checking website star status:', err);
      setIsStarred(false);
    }
  };

  const handleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('请先登录再点赞');
      navigate('/login');
      return;
    }
    if (isStarring) return;
    setIsStarring(true);

    try {
      if (isStarred) {
        const { error } = await supabase
          .from('website_stars')
          .delete()
          .eq('user_id', user.id)
          .eq('website_id', id);
        if (error) throw error;
        setCurrentStarCount((prev) => prev - 1);
        setIsStarred(false);
        toast.success('已取消收藏');
      } else {
        const { error } = await supabase
          .from('website_stars')
          .insert([{ user_id: user.id, website_id: id }]);
        if (error) throw error;
        setCurrentStarCount((prev) => prev + 1);
        setIsStarred(true);
        toast.success('感谢您的收藏！');
      }
    } catch (err) {
      console.error('Error toggling website star:', err);
      toast.error('操作失败，请稍后重试');
    } finally {
      setIsStarring(false);
    }
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

  const handleVisitWebsite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('请先登录才能访问网站');
      navigate('/login');
      return;
    }
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.error("Website URL is undefined in WebsiteCard props");
      toast.error("无法打开网站，链接无效");
    }
  };

  // 卡片点击处理 - 导航到网站详情页
  const handleCardClick = () => {
    sessionStorage.setItem('websiteNavPageScroll', window.scrollY.toString());
    if (typeof currentPageForNav === 'number') {
      sessionStorage.setItem('websiteNavPageCurrentPage', currentPageForNav.toString());
    }
    navigate(`/website/${id}`);
  };

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isHovered ? transform : '',
        background: isHovered ? background : '',
        transition: !isHovered ? 'all 0.5s ease-out' : 'none'
      }}
      className={clsx(
        "group relative bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl rounded-2xl overflow-hidden",
        "transition-all duration-300 ease-out",
        "hover:shadow-[0_10px_40px_-15px_rgba(0,0,0,0.2)]",
        "active:shadow-[0_5px_15px_-10px_rgba(0,0,0,0.2)]",
        "cursor-pointer border border-white/30",
        "hover:scale-[1.02]",
        "active:scale-[0.98]",
        isHovered && "z-10"
      )}
    >
      {/* 光晕效果 */}
      {isHovered && (
        <div 
          className="absolute inset-0 z-0 opacity-70 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, rgba(99, 102, 241, 0.3) 0%, rgba(255, 255, 255, 0) 70%)`,
            mixBlendMode: 'overlay'
          }}
        />
      )}
      
      <div className="p-6 relative z-1">
        <div className="flex items-start gap-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            {!imageError ? (
              <img
                src={iconUrl || ''}
                alt={`${name} 的图标`}
                className="w-full h-full rounded-xl object-cover transition-transform duration-300 group-hover:scale-110"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center" aria-hidden="true">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {name}
              <span className="sr-only">网站</span>
            </h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2" aria-label={`${name} 的描述：${description}`}>
              {description}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-600">
              {category}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleStar}
              disabled={isStarring}
              className={clsx(
                "flex items-center transition-all duration-300",
                "rounded-full px-3 py-1",
                "focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1",
                "transform hover:scale-110 active:scale-95",
                isStarred ? [
                  "bg-yellow-50",
                  "text-yellow-500 hover:text-yellow-600",
                ] : [
                  "text-gray-400 hover:text-yellow-500",
                ]
              )}
              aria-label={isStarred ? "取消收藏" : "收藏"}
              aria-pressed={isStarred}
            >
              <Star
                size={16}
                className={clsx(
                  "transition-all duration-500 ease-in-out",
                  "group-hover:rotate-[360deg]",
                  "active:rotate-[720deg]",
                  isStarred ? "fill-current" : "fill-none"
                )}
              />
              <span className="ml-1 text-sm font-medium">{currentStarCount}</span>
            </button>

            <button
              onClick={handleVisitWebsite}
              className={clsx(
                "flex items-center gap-2 px-4 py-2",
                "bg-gradient-to-r from-indigo-500 to-indigo-600",
                "text-white rounded-xl",
                "hover:from-indigo-600 hover:to-indigo-700",
                "transition-all duration-200",
                "shadow-sm hover:shadow-md",
                "active:scale-[0.98]",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              )}
              aria-label={`访问 ${name} 网站`}
            >
              <ExternalLink size={16} aria-hidden="true" />
              {user ? "访问网站" : "登录访问"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebsiteCard; 