import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, FALLBACK_STAR_COUNTS } from '../lib/supabase';
import { ExternalLink, ArrowLeft, Star, Image as ImageIcon, BookOpen, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import ImageLightbox from '../components/ImageLightbox';

interface Website {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  url: string;
  screenshots: string[];
  star_count: number;
  website_categories: {
    name: string;
  } | null;
  tags: { id: string; name: string }[];
  tutorial_url?: string;
  is_recommended?: boolean;
}

const WebsiteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [website, setWebsite] = useState<Website | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [iconError, setIconError] = React.useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState(0);
  const [loadingStarStatus, setLoadingStarStatus] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxCurrentImageIndex, setLightboxCurrentImageIndex] = useState(0);

  useEffect(() => {
    loadWebsiteDetails();
  }, [id]);

  useEffect(() => {
    if (user && website) {
      checkIfStarred();
    }
  }, [user, website]);

  const loadWebsiteDetails = async () => {
    if (!id) return;
    try {
      const { data: websiteData, error: websiteError } = await supabase
        .from('websites')
        .select(`
          *,
          website_categories (name)
        `)
        .eq('id', id)
        .single();

      if (websiteError || !websiteData) {
        console.error('Error loading website core data:', websiteError);
        toast.error('加载网站信息失败（核心数据）');
        navigate('/websites');
        return;
      }

      let currentStarCount = 0;
      try {
        const { data: starData, error: rpcError } = await supabase
          .rpc('get_website_star_counts');
        
        if (rpcError || !starData) {
          console.warn('获取网站星星数量失败 (RPC: get_website_star_counts):', rpcError || '无数据');
          const fallbackStar = FALLBACK_STAR_COUNTS.find(item => item.software_id === id);
          currentStarCount = fallbackStar ? fallbackStar.star_count : (typeof websiteData.star_count === 'number' ? websiteData.star_count : 0); 
        } else {
          const currentWebsiteStar = starData.find((item: any) => item.website_id === id);
          currentStarCount = currentWebsiteStar ? currentWebsiteStar.star_count : 0;
        }
      } catch (error) {
        console.error('调用RPC get_website_star_counts 获取星星数量时出错:', error);
        const fallbackStar = FALLBACK_STAR_COUNTS.find(item => item.software_id === id);
        currentStarCount = fallbackStar ? fallbackStar.star_count : (typeof websiteData.star_count === 'number' ? websiteData.star_count : 0); 
      }
      
      setWebsite({
        ...(websiteData as Omit<Website, 'tags' | 'star_count'>),
        star_count: currentStarCount,
        tags: [],
        id: websiteData.id,
        name: websiteData.name,
        description: websiteData.description,
        icon_url: websiteData.icon_url,
        url: websiteData.url,
        screenshots: websiteData.screenshots || [],
        website_categories: websiteData.website_categories,
        tutorial_url: websiteData.tutorial_url,
        is_recommended: websiteData.is_recommended,
      });
      setStarCount(currentStarCount);

      if (websiteData.screenshots && websiteData.screenshots.length > 0) {
        setSelectedImage(websiteData.screenshots[0]);
      }

    } catch (error) {
      console.error('Error loading website details:', error);
      toast.error('加载网站信息失败');
      navigate('/websites');
    }
  };

  const checkIfStarred = async () => {
    if (!user || !website || !website.id) return;
    try {
      const { data } = await supabase
        .from('website_stars')
        .select('id')
        .eq('website_id', website.id)
        .eq('user_id', user.id)
        .single();
      setIsStarred(!!data);
    } catch (error) {
      if ((error as any).code !== 'PGRST116') {
        console.error('Error checking star status:', error);
      } else {
        setIsStarred(false);
      }
    }
  };

  const handleStar = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (loadingStarStatus || !website || !website.id) return;
    setLoadingStarStatus(true);
    try {
      if (isStarred) {
        const { error } = await supabase
          .from('website_stars')
          .delete()
          .eq('website_id', website.id)
          .eq('user_id', user.id);

        if (error) throw error;
        setStarCount((prev: number) => prev - 1);
        setIsStarred(false);
        toast.success('已取消点赞');
      } else {
        const { error } = await supabase
          .from('website_stars')
          .insert([
            {
              user_id: user.id,
              website_id: website.id
            }
          ]);

        if (error) throw error;
        setStarCount((prev: number) => prev + 1);
        setIsStarred(true);
        toast.success('感谢您的点赞！');
      }
    } catch (error) {
      console.error('Error toggling star:', error);
      toast.error('操作失败，请稍后重试');
    } finally {
      setLoadingStarStatus(false);
    }
  };

  const handleVisitWebsite = () => {
    if (!website) return;
    
    if (!user) {
      navigate('/login');
      return;
    }

    handleActualVisit();
  };

  const handleActualVisit = () => {
    if (!website) return;
    if (website.url) {
      window.open(website.url, '_blank');
    }
  };

  const handleImageError = (index: number) => {
    if (!website || !website.screenshots) return;
    const currentScreenshotUrl = website.screenshots[index];
    const newScreenshots = website.screenshots.filter((_: string, i: number) => i !== index);
    
    setWebsite(prev => prev ? { ...prev, screenshots: newScreenshots } : null);

    if (selectedImage === currentScreenshotUrl) {
      setSelectedImage(newScreenshots.length > 0 ? newScreenshots[0] : null);
    }
    
    if (isLightboxOpen && website.screenshots[lightboxCurrentImageIndex] === currentScreenshotUrl) {
      if (newScreenshots.length === 0) {
        setIsLightboxOpen(false);
      } else {
        setLightboxCurrentImageIndex((prevIdx: number) => Math.min(prevIdx, newScreenshots.length - 1));
      }
    }
  };

  const openLightbox = (index: number) => {
    if (website && website.screenshots && website.screenshots[index]) {
      setLightboxCurrentImageIndex(index);
      setIsLightboxOpen(true);
    }
  };

  const handleLightboxPrev = () => {
    if (website && website.screenshots) {
      setLightboxCurrentImageIndex((prevIndex: number) => 
        (prevIndex - 1 + website.screenshots.length) % website.screenshots.length
      );
    }
  };

  const handleLightboxNext = () => {
    if (website && website.screenshots) {
      setLightboxCurrentImageIndex((prevIndex: number) => 
        (prevIndex + 1) % website.screenshots.length
      );
    }
  };

  if (!website) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">加载中...</div>
      </div>
    );
  }

  const starButtonClasses = clsx(
    "flex items-center transition-all duration-300",
    "rounded-full px-3 py-1",
    isStarred ? ["bg-yellow-50", "text-yellow-500"] : ["text-gray-400", "hover:text-yellow-500"],
    "transform hover:scale-110"
  );
  const starIconClasses = clsx(
    isStarred && "fill-current", 
    "transition-all duration-500", 
    "hover:rotate-[360deg]"
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors duration-300"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        返回
      </button>

      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden border border-white/30">
        <div className="p-8">
          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4 sm:gap-6">
            <div className="relative w-16 h-16 md:w-24 md:h-24 flex-shrink-0">
              {!iconError ? (
                <img
                  src={website.icon_url}
                  alt={website.name}
                  className="w-full h-full rounded-xl shadow-lg object-cover bg-white"
                  onError={() => setIconError(true)}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-0">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{website.name}</h1>
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                    {website.website_categories && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                        {website.website_categories.name}
                      </span>
                    )}
                    {website.tags && website.tags.map(tag => (
                      <span key={tag.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700">
                        {tag.name}
                      </span>
                    ))}
                    {website.is_recommended && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
                        推荐
                      </span>
                    )}
                    <button
                      onClick={handleStar}
                      disabled={loadingStarStatus}
                      className={starButtonClasses}
                    >
                      <Star size={18} className={starIconClasses} />
                      <span className="ml-1 font-medium">{starCount}</span>
                    </button>
                  </div>
                </div>
                <div className="flex flex-row items-center justify-start gap-3 mt-4 md:mt-0">
                  {website.tutorial_url && (
                    <button
                      onClick={() => window.open(website.tutorial_url, '_blank', 'noopener,noreferrer')}
                      className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
                      title="查看使用教程"
                    >
                      <BookOpen className="w-5 h-5" />
                      使用教程
                    </button>
                  )}
                  <button
                    onClick={handleVisitWebsite}
                    className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <ExternalLink className="w-5 h-5" />
                    {user ? '访问网站' : '登录访问'}
                  </button>
                </div>
              </div>
              
              <p className="mt-4 text-gray-600 leading-relaxed">
                {website.description}
              </p>
            </div>
          </div>
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">网站截图</h2>
            {website.screenshots && website.screenshots.length > 0 ? (
              <div className="relative group">
                <div 
                  className="aspect-video rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={() => {
                    if (selectedImage && website.screenshots.includes(selectedImage)){
                        const currentIndex = website.screenshots.indexOf(selectedImage);
                        openLightbox(currentIndex);
                    } else if (website.screenshots.length > 0) {
                        openLightbox(0);
                    }
                  }}
                >
                  {selectedImage ? (
                    <img
                      src={selectedImage}
                      alt={`${website.name} screenshot`}
                      className="w-full h-full object-contain"
                      onError={() => {
                        if (selectedImage) {
                           const index = website.screenshots.indexOf(selectedImage);
                           if (index !== -1) handleImageError(index);
                        }
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                </div>
                
                {website.screenshots.length > 1 && selectedImage && (
                  <button 
                    onClick={(e: React.MouseEvent) => { 
                      e.stopPropagation();
                      const currentIndex = website.screenshots.indexOf(selectedImage!);
                      const prevIndex = (currentIndex - 1 + website.screenshots.length) % website.screenshots.length;
                      setSelectedImage(website.screenshots[prevIndex]);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                    aria-label="上一张截图"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                {website.screenshots.length > 1 && selectedImage && (
                  <button 
                    onClick={(e: React.MouseEvent) => { 
                      e.stopPropagation();
                      const currentIndex = website.screenshots.indexOf(selectedImage!);
                      const nextIndex = (currentIndex + 1) % website.screenshots.length;
                      setSelectedImage(website.screenshots[nextIndex]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                    aria-label="下一张截图"
                  >
                    <ArrowRight size={20} />
                  </button>
                )}
                
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-4">
                  {website.screenshots.map((screenshot, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(screenshot)} 
                      className={clsx(
                        "relative aspect-video rounded-lg overflow-hidden cursor-pointer",
                        "transition-all duration-300",
                        selectedImage === screenshot 
                          ? ["ring-2 ring-blue-500", "scale-105"]
                          : ["hover:ring-2 hover:ring-blue-300", "hover:scale-105"]
                      )}
                    >
                      <img
                        src={screenshot}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(index)}
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-12 flex flex-col items-center justify-center">
                <ImageIcon className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500">暂无截图</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isAdModalOpen && (
        <AdModal
          isOpen={isAdModalOpen}
          onClose={() => setIsAdModalOpen(false)}
          onDownload={handleActualVisit}
        />
      )}

      {website && website.screenshots && website.screenshots.length > 0 && (
        <ImageLightbox 
          isOpen={isLightboxOpen}
          screenshots={website.screenshots}
          currentIndex={lightboxCurrentImageIndex}
          onClose={() => setIsLightboxOpen(false)}
          onPrev={handleLightboxPrev}
          onNext={handleLightboxNext}
          altText={`Enlarged screenshot for ${website.name}`}
        />
      )}
    </div>
  );
};

export default WebsiteDetail;