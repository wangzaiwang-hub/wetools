import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface AdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
}

interface AdItem {
  id: string;
  image_url: string;
  link: string;
  title?: string;
  description?: string;
}

// 默认广告数据（确保始终有展示内容）
const DEFAULT_ADS: AdItem[] = [
  {
    id: '1',
    image_url: 'https://images.unsplash.com/photo-1603899122634-f086ca5f5ddd?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8c29mdHdhcmV8ZW58MHx8MHx8&auto=format&fit=crop&w=800&q=60',
    link: 'https://example.com/software-promo',
    title: '软件推广',
    description: '发现最好的开发工具'
  },
  {
    id: '2',
    image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8NHx8Y29tcHV0ZXIlMjBwcm9ncmFtbWluZ3xlbnwwfHwwfHw%3D&auto=format&fit=crop&w=800&q=60',
    link: 'https://example.com/programming-tools',
    title: '编程工具',
    description: '提升开发效率的必备工具'
  },
  {
    id: '3',
    image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MTB8fHRlY2h8ZW58MHx8MHx8&auto=format&fit=crop&w=800&q=60',
    link: 'https://example.com/tech-gadgets',
    title: '科技小工具',
    description: '最新科技产品推荐'
  }
];

const AdModal: React.FC<AdModalProps> = ({ isOpen, onClose, onDownload }) => {
  const [current, setCurrent] = useState({
    happiness: 0.9,
    derp: 1,
    px: 0.5,
    py: 0.5
  });
  const [target, setTarget] = useState({ ...current });
  const [isAccepted, setIsAccepted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [adItems, setAdItems] = useState<AdItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasDownloadedRef = useRef(false);
  
  // 本地存储键
  const LOCAL_STORAGE_KEY = 'advertisement_order';

  // 加载广告数据
  useEffect(() => {
    if (isOpen) {
      // 当模态框打开时加载广告
      const loadAds = async () => {
        setIsLoading(true);
        try {
          await fetchAdsFromSupabase();
        } catch (error) {
          console.error('加载广告失败:', error);
          // 使用默认广告
          setAdItems(DEFAULT_ADS);
          setCurrentImageIndex(0);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadAds();
    }
  }, [isOpen]);

  // 从Supabase获取广告数据
  const fetchAdsFromSupabase = async () => {
    try {
      console.log("正在从Supabase获取广告数据...");
      
      // 从广告表中获取数据
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) {
        console.error("Supabase查询错误:", error.message);
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log("成功获取广告数据:", data.length, "条");
        
        // 确保所有广告都有display_order
        const adsWithOrder = data.map((ad, index) => ({
          ...ad,
          display_order: ad.display_order ?? index
        }));
        
        // 按照display_order排序
        const sortedAds = adsWithOrder.sort((a, b) => {
          const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
        
        setAdItems(sortedAds);
        setCurrentImageIndex(0);
        return;
      }
      
      // 如果没有获取到数据，使用API获取
      await fetchFromApi();
    } catch (error) {
      console.error("获取广告数据失败:", error);
      await fetchFromApi();
    }
  };

  // 从API获取广告数据
  const fetchFromApi = async () => {
    try {
      console.log("尝试从API获取广告数据...");
      
      const response = await fetch('/api/ads', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      // 检查响应状态
      if (!response.ok) {
        console.error("API响应不成功:", response.status);
        throw new Error(`API响应不成功: ${response.status}`);
      }

      // 检查内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error("响应不是JSON格式:", contentType);
        throw new Error(`响应不是JSON格式: ${contentType}`);
      }

      // 使用try-catch包装JSON解析，避免解析错误导致程序崩溃
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("解析API响应JSON失败:", jsonError);
        // 如果解析失败，可以直接查看响应文本，帮助调试
        const textResponse = await response.text();
        console.error("API响应原始内容:", textResponse.substring(0, 200)); // 只显示前200个字符
        throw new Error("解析API响应失败");
      }
      
      if (Array.isArray(data) && data.length > 0) {
        console.log("成功从API获取广告数据:", data.length, "条");
        setAdItems(data);
        setCurrentImageIndex(0);
      } else {
        console.log("API未返回有效广告数据，使用备用方案");
        await fetchFromScreenshotsBackup();
      }
    } catch (error) {
      console.error("从API获取广告数据失败:", error);
      await fetchFromScreenshotsBackup();
    }
  };

  // 备用方案：从软件截图存储桶获取图片
  const fetchFromScreenshotsBackup = async () => {
    try {
      console.log("正在从软件截图存储桶获取备用图片...");
      
      // 首先尝试获取ads文件夹中的图片
      const { data, error } = await supabase.storage
        .from('software-images')
        .list('ads', {
          limit: 5,
          sortBy: { column: 'name', order: 'desc' }
        });
      
      if (error) {
        console.error("获取存储桶文件列表失败:", error.message);
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log("从存储桶获取了", data.length, "张图片");
        
        // 创建广告项
        const backupAds = await Promise.all(data.map(async (file, index) => {
          // 获取公共URL
          const { data: urlData } = supabase.storage
            .from('software-images')
            .getPublicUrl(`ads/${file.name}`);
          
          return {
            id: `backup-${index}`,
            image_url: urlData.publicUrl,
            link: 'https://example.com/software'
          };
        }));
        
        setAdItems(backupAds);
        setCurrentImageIndex(0);
        setIsLoading(false);
        return;
      }
      
      // 如果ads文件夹没有图片，尝试screenshots文件夹
      await fetchFromScreenshotsFolder();
    } catch (error) {
      console.error("备用获取方法失败:", error);
      // 尝试screenshots文件夹
      await fetchFromScreenshotsFolder();
    }
  };
  
  // 从screenshots文件夹获取图片
  const fetchFromScreenshotsFolder = async () => {
    try {
      console.log("尝试从screenshots文件夹获取图片...");
      
      const { data, error } = await supabase.storage
        .from('software-images')
        .list('screenshots', {
          limit: 5,
          sortBy: { column: 'name', order: 'desc' }
        });
      
      if (error) {
        console.error("获取screenshots文件列表失败:", error.message);
        // 最后兜底使用默认广告
        setAdItems(DEFAULT_ADS);
        setCurrentImageIndex(0);
        setIsLoading(false);
        return;
      }
      
      if (data && data.length > 0) {
        // 创建临时广告项
        const screenshotAds = await Promise.all(data.map(async (file, index) => {
          const { data: urlData } = supabase.storage
            .from('software-images')
            .getPublicUrl(`screenshots/${file.name}`);
          
          return {
            id: `screenshot-${index}`,
            image_url: urlData.publicUrl,
            link: 'https://wetools.com/software',
            title: file.name.split('-').pop()?.split('.')[0] || '专业软件',
            description: `高效率工具，提升${index + 1}倍生产力`
          };
        }));
        
        setAdItems(screenshotAds);
        setCurrentImageIndex(0);
      } else {
        // 如果什么都没有，使用默认广告
        setAdItems(DEFAULT_ADS);
        setCurrentImageIndex(0);
      }
    } catch (error) {
      console.error("获取screenshots失败:", error);
      // 兜底使用默认广告
      setAdItems(DEFAULT_ADS);
      setCurrentImageIndex(0);
    } finally {
      setIsLoading(false);
    }
  };

  // 上传图片到Supabase存储桶（参考软件截图上传方式）
  const uploadImageToSupabase = async (file: File): Promise<string> => {
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `ads/${fileName}`;
      
      console.log("正在上传图片到Supabase...", filePath);
      
      // 使用与软件截图相同的存储桶
      const { error: uploadError } = await supabase.storage
        .from('software-images')
        .upload(filePath, file);
      
      if (uploadError) {
        console.error("上传错误:", uploadError);
        throw uploadError;
      }
      
      // 获取公共URL
      const { data } = supabase.storage
        .from('software-images')
        .getPublicUrl(filePath);
      
      console.log("图片上传成功，URL:", data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error("图片上传失败:", error);
      throw new Error('图片上传失败');
    }
  };

  // 自动轮播
  useEffect(() => {
    if (!isOpen || adItems.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentImageIndex((prev: number) => (prev + 1) % adItems.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [isOpen, adItems.length]);

  useEffect(() => {
    if (!isOpen) {
      setIsAccepted(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let animationFrame: number;

    const update = () => {
      setCurrent(prev => {
        const next = { ...prev };
        for (let prop in target) {
          if (target[prop as keyof typeof target] === prev[prop as keyof typeof prev]) {
            continue;
          } else if (Math.abs(target[prop as keyof typeof target] - prev[prop as keyof typeof prev]) < 0.01) {
            next[prop as keyof typeof next] = target[prop as keyof typeof target];
          } else {
            next[prop as keyof typeof next] = prev[prop as keyof typeof prev] + 
              (target[prop as keyof typeof target] - prev[prop as keyof typeof prev]) * 0.1;
          }
        }
        return next;
      });
      animationFrame = requestAnimationFrame(update);
    };

    if (isOpen) {
      animationFrame = requestAnimationFrame(update);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [target, isOpen]);

  useEffect(() => {
    if (isOpen && onDownload && !hasDownloadedRef.current) {
      onDownload();
      hasDownloadedRef.current = true;
    }
    
    if (!isOpen) {
      // 重置下载标记，以便下次打开时可以再次下载
      hasDownloadedRef.current = false;
    }
  }, [isOpen, onDownload]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const confirm = e.currentTarget;
    const btnDelete = confirm.querySelector('.Confirm-Body-Button_Delete');
    const btnCancel = confirm.querySelector('.Confirm-Body-Button_Cancel');
    
    if (!btnDelete || !btnCancel) return;

    const rect = confirm.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    const deleteRect = btnDelete.getBoundingClientRect();
    const cancelRect = btnCancel.getBoundingClientRect();
    
    const dx1 = x - deleteRect.x - deleteRect.width * 0.5;
    const dy1 = y - deleteRect.y - deleteRect.height * 0.5;
    const dx2 = x - cancelRect.x - cancelRect.width * 0.5;
    const dy2 = y - cancelRect.y - cancelRect.height * 0.5;
    
    const px = (x - rect.x) / rect.width;
    const py = (y - rect.y) / rect.height;
    
    const distDelete = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const distCancel = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    const happiness = Math.pow(distDelete / (distCancel + distDelete), 0.75);

    setTarget({
      happiness,
      derp: 0,
      px,
      py
    });
  };

  const handleMouseLeave = () => {
    setTarget({
      happiness: 0.9,
      derp: 1,
      px: 0.5,
      py: 0.5
    });
  };

  // 手动切换到上一张图片
  const goToPrevImage = () => {
    setCurrentImageIndex((prev: number) => 
      prev === 0 ? adItems.length - 1 : prev - 1
    );
  };

  // 手动切换到下一张图片
  const goToNextImage = () => {
    setCurrentImageIndex((prev: number) => 
      (prev + 1) % adItems.length
    );
  };

  // 处理广告点击
  const handleAdClick = (link: string) => {
    if (link) {
      window.open(link, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <style jsx>{`
        .Confirm {
          position: relative;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          width: 360px;
          height: 480px;
          background-color: #FFE4E1;
          border-radius: 1rem;
          box-shadow: 0px 10px 5px -3px rgba(0, 0, 0, 0.2);
          z-index: 1;
        }

        @media (min-width: 1024px) {
          .Confirm {
            width: 1000px;
            height: 750px;
          }
          .Boi {
            width: 280px !important;
            height: 280px !important;
          }
        }

        .Boi {
          --happiness: ${current.happiness};
          --derp: ${current.derp};
          --px: ${current.px};
          --py: ${current.py};
          width: 160px;
          height: 160px;
          position: relative;
          background-image: radial-gradient(#f7e0b2, #eb5);
          border-radius: 100%;
          overflow: hidden;
          margin: 0 auto;
          border: solid 2px #ecb23e;
          box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.2);
        }
        .Boi * {
          position: absolute;
        }
        .Boi::before {
          content: '';
          display: block;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          background-image: linear-gradient(to bottom, #5a8, rgba(85, 170, 136, 0));
          opacity: calc(1 - var(--happiness));
        }
        .Boi-Blush {
          width: 20%;
          height: 10%;
          background-color: rgba(255, 100, 100, 0.3);
          border: 3px solid rgba(255, 100, 100, 0.3);
          top: calc(45% + var(--py) * 10%);
          border-radius: 100%;
          opacity: calc(var(--happiness) * var(--happiness) * 0.9 + 0.1);
        }
        .Boi-Blush_L {
          left: calc(7% + var(--px) * 2%);
        }
        .Boi-Blush_R {
          right: calc(9% - var(--px) * 2%);
        }
        .Boi-Eye {
          width: calc(26% - var(--happiness) * 2%);
          height: calc(26% - var(--happiness) * 2%);
          background-color: #f6f6f6;
          border-radius: 100%;
          top: calc(25% + var(--py) * 10%);
          overflow: hidden;
        }
        .Boi-Eye_L {
          left: calc(18% + var(--px) * 4%);
        }
        .Boi-Eye_R {
          right: calc(22% - var(--px) * 4%);
        }
        .Boi-Eye::after {
          content: '';
          display: block;
          background-color: #421;
          width: calc(55% - var(--happiness) * 10%);
          height: calc(55% - var(--happiness) * 10%);
          border-radius: 100%;
          position: absolute;
        }
        .Boi-Eye_L::after {
          transform: translate(calc((var(--px) + var(--derp) * 0.5) * 100%), calc((var(--py) + var(--derp) * 0.5) * 100%));
        }
        .Boi-Eye_R::after {
          transform: translate(calc((var(--px) + var(--derp) * -0.3) * 100%), calc((var(--py) + var(--derp) * -0.3) * 100%));
        }
        .Boi-Mouth {
          width: calc(51% - var(--happiness) * 2%);
          height: calc(26% - var(--happiness) * 2%);
          background-color: #a33;
          border-radius: calc((1 - var(--happiness)) * 10em) calc((1 - var(--happiness)) * 10em) calc(var(--happiness) * 16em) calc(var(--happiness) * 16em);
          top: calc(57.5% + var(--py) * 5%);
          left: calc(47.5% + var(--px) * 5%);
          transform: translateX(-50%);
          overflow: hidden;
          border: 3px solid #962d2d;
        }
        .Boi-Mouth::before {
          content: '';
          display: block;
          position: absolute;
          width: 20%;
          height: 20%;
          top: 0;
          left: 50%;
          background-color: white;
          border-radius: 0 0 0.5rem 0.5rem;
        }
        .Boi-Mouth::after {
          content: '';
          display: block;
          position: absolute;
          width: 60%;
          height: 50%;
          left: 10%;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 20rem 20rem 0 0;
        }
        .carousel {
          position: relative;
          width: 100%;
          height: 100%;
          perspective: 1000px;
          transform-style: preserve-3d;
        }
        .carousel-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
        }
        .carousel-item {
          position: absolute;
          width: 60%;
          height: 100%;
          left: 20%;
          transition: transform 0.5s ease;
          transform-style: preserve-3d;
          cursor: pointer;
          overflow: hidden;
          border-radius: 10px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background-color: white;
        }
        .carousel-item img {
          width: auto;
          height: auto;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          background: white;
        }
        .carousel-dots {
          position: absolute;
          bottom: 1rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 0.5rem;
          z-index: 10;
        }
        .carousel-dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: background-color 0.3s;
        }
        .carousel-dot.active {
          background-color: white;
        }
        .carousel-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.3);
          border: none;
          font-size: 20px;
          font-weight: bold;
          cursor: pointer;
          outline: inherit;
          padding: 10px 15px;
          color: white;
          z-index: 20;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 40px;
          width: 40px;
          opacity: 0;
        }
        .carousel:hover .carousel-arrow {
          opacity: 0.7;
        }
        .carousel-arrow:hover {
          background: rgba(0, 0, 0, 0.6);
          opacity: 1 !important;
        }
        .carousel-arrow-left {
          left: 10px;
          border-radius: 50%;
        }
        .carousel-arrow-right {
          right: 10px;
          border-radius: 50%;
        }
      `}</style>

      <div 
        className="Confirm"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-center p-2 border-b border-gray-200">
          <div className="flex space-x-2 absolute left-2">
            <button
              onClick={onClose}
              className="w-3 h-3 md:w-3 md:h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
            />
            <div className="w-3 h-3 md:w-3 md:h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 md:w-3 md:h-3 rounded-full bg-green-500" />
          </div>
          <h1 className="text-base md:text-lg font-medium w-full text-center">正在下载...</h1>
        </div>

        <h2 className="text-sm md:text-base text-center mt-2 md:mt-2 mb-2 md:mb-2 w-full">
          {isAccepted ? '谢谢你 😊' : '这是个广告，支持一下可以吗'}
        </h2>

        <div className="flex-1 flex flex-col items-center justify-center p-2 md:p-4">
          <div className="w-full max-w-[200px] md:max-w-[600px] h-24 md:h-[280px] bg-gray-50 rounded-lg shadow-md mb-2 md:mb-4 overflow-hidden relative">
            <div className="carousel">
              <div className="carousel-inner">
                {isLoading ? (
                  <div className="carousel-item" style={{ opacity: 1, zIndex: 0 }}>
                    <p className="text-gray-500">正在加载广告...</p>
                  </div>
                ) : adItems.length > 0 ? (
                  adItems.map((ad, index) => {
                    const offset = index - currentImageIndex;
                    const zIndex = -Math.abs(offset);
                    const opacity = Math.max(1 - Math.abs(offset) * 0.5, 0);
                    const transform = `
                      translateX(${offset * 50}%) 
                      translateZ(${-Math.abs(offset) * 100}px)
                      rotateY(${offset * 15}deg)
                    `;

                    return (
                      <div
                        key={ad.id}
                        className="carousel-item"
                        style={{
                          transform,
                          zIndex,
                          opacity,
                        }}
                        onClick={() => handleAdClick(ad.link)}
                      >
                        {/* 广告标题 - 改为更美观的样式 */}
                        <div className="absolute top-0 left-0 right-0 bg-white/90 p-2 z-10 border-b border-gray-200">
                          <h3 className="text-gray-800 text-sm md:text-base font-medium text-center truncate">
                            {ad.title || '精品软件推荐 (默认)'}
                          </h3>
                        </div>
                        
                        <div className="pt-8 pb-8 px-2 flex items-center justify-center bg-white w-full h-full">
                          <img
                            src={ad.image_url}
                            alt={`广告图片 ${index + 1}`}
                            className="w-auto h-auto max-w-full max-h-[calc(100%-40px)] object-contain"
                            onError={(e) => {
                              // 图片加载失败时显示默认图片
                              console.error("图片加载失败，使用默认图片", ad.image_url);
                              const target = e.target as HTMLImageElement;
                              target.src = DEFAULT_ADS[0].image_url;
                            }}
                          />
                        </div>
                        
                        {/* 广告描述 - 改为更美观的样式 */}
                        <div className="absolute bottom-0 left-0 right-0 bg-white/90 p-2 z-10 border-t border-gray-200">
                          <p className="text-gray-600 text-xs md:text-sm text-center truncate">
                            {ad.description || '专业软件工具集 (默认)'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="carousel-item" style={{ opacity: 1, zIndex: 0 }}>
                    <p className="text-gray-500">没有可显示的广告</p>
                  </div>
                )}
              </div>
              
              {/* 添加左右箭头控制 */}
              {adItems.length > 1 && (
                <>
                  <button 
                    onClick={goToPrevImage}
                    className="carousel-arrow carousel-arrow-left"
                    aria-label="上一张图片"
                  >
                    &#10094;
                  </button>
                  <button 
                    onClick={goToNextImage}
                    className="carousel-arrow carousel-arrow-right"
                    aria-label="下一张图片"
                  >
                    &#10095;
                  </button>
                </>
              )}
              
              {adItems.length > 1 && (
                <div className="carousel-dots">
                  {adItems.map((ad, index) => (
                    <div
                      key={ad.id}
                      className={`carousel-dot ${index === currentImageIndex ? 'active' : ''}`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="Boi mb-2 md:mb-4" style={{ transform: 'scale(0.7)' }}>
            <div className="Boi-Blush Boi-Blush_L" />
            <div className="Boi-Blush Boi-Blush_R" />
            <div className="Boi-Eye Boi-Eye_L" />
            <div className="Boi-Eye Boi-Eye_R" />
            <div className="Boi-Mouth" />
          </div>
          
          <div className="flex justify-between w-full max-w-[200px] md:max-w-[600px] mt-2">
            <button
              onClick={() => {
                setIsAccepted(true);
                const currentAd = adItems[currentImageIndex];
                if (currentAd && currentAd.link) {
                  window.open(currentAd.link, '_blank');
                }
                onClose();
              }}
              className="Confirm-Body-Button Confirm-Body-Button_Cancel px-4 md:px-8 py-1.5 md:py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm md:text-base"
            >
              接受
            </button>
            <button
              onClick={onClose}
              className="Confirm-Body-Button Confirm-Body-Button_Delete px-4 md:px-8 py-1.5 md:py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm md:text-base"
            >
              拒绝
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdModal; 