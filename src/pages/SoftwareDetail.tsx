import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, FALLBACK_STAR_COUNTS } from '../lib/supabase';
import { Download, ArrowLeft, Star, Image as ImageIcon, BookOpen, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import AdModal from '../components/AdModal';
import ImageLightbox from '../components/ImageLightbox';

interface Software {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  screenshots: string[];
  star_count: number;
  categories: {
    name: string;
  };
  operating_systems: {
    name: string;
  };
  direct_download_url?: string;
  cloud_download_url?: string;
  tutorial_url?: string;
}

const SoftwareDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [software, setSoftware] = useState<Software | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [iconError, setIconError] = React.useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState(0);
  const [isStarring, setIsStarring] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxCurrentImageIndex, setLightboxCurrentImageIndex] = useState(0);

  useEffect(() => {
    loadSoftware();
  }, [id]);

  useEffect(() => {
    if (user) {
      checkIfStarred();
    }
  }, [user, id]);

  const checkIfStarred = async () => {
    if (!user || !id) return;
    
    const { data } = await supabase
      .from('user_stars')
      .select('id')
      .eq('software_id', id)
      .eq('user_id', user.id)
      .single();
    
    setIsStarred(!!data);
  };

  const loadSoftware = async () => {
    if (!id) return;
    
    try {
      const { data: softwareData, error: softwareError } = await supabase
        .from('software')
        .select(`
          *,
          categories (
            name
          ),
          operating_systems (
            name
          )
        `)
        .eq('id', id)
        .single();

      if (softwareError) {
        toast.error('加载软件信息失败');
        navigate('/');
        return;
      }

      let starCountLocal = 0;
      try {
        const { data: starData, error: starError } = await supabase
          .rpc('get_software_star_counts')
          .eq('software_id', id)
          .single();
        if (starError) {
          console.error('Error loading star count:', starError);
          const fallbackStar = FALLBACK_STAR_COUNTS.find(item => item.software_id === id);
          starCountLocal = fallbackStar ? fallbackStar.star_count : Math.floor(Math.random() * 5) + 1;
        } else {
          starCountLocal = starData?.star_count || 0;
        }
      } catch (starErrorCatch) {
        console.error('Failed to fetch star count:', starErrorCatch);
        starCountLocal = Math.floor(Math.random() * 5) + 1;
      }

      setSoftware({
        ...softwareData,
        star_count: starCountLocal
      });
      setStarCount(starCountLocal);

      if (softwareData.screenshots && softwareData.screenshots.length > 0) {
        setSelectedImage(softwareData.screenshots[0]);
      }
    } catch (error) {
      console.error('Error loading software:', error);
      toast.error('加载软件信息失败');
      navigate('/');
    }
  };

  const handleStar = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (isStarring || !id) return;
    setIsStarring(true);

    try {
      if (isStarred) {
        const { error } = await supabase
          .from('user_stars')
          .delete()
          .eq('software_id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        setStarCount(prev => prev - 1);
        setIsStarred(false);
        toast.success('已取消点赞');
      } else {
        const { error } = await supabase
          .from('user_stars')
          .insert({ software_id: id, user_id: user.id });

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

  const handleDownload = () => {
    if (!software) return;
    
    if (!user) {
      navigate('/login');
      return;
    }

    setIsAdModalOpen(true);
  };

  const handleActualDownload = () => {
    if (!software) return;
    const url = software.direct_download_url || software.cloud_download_url;
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleImageError = (index: number) => {
    if (!software || !software.screenshots) return;
    const currentScreenshotUrl = software.screenshots[index];
    const newScreenshots = software.screenshots.filter((_: string, i: number) => i !== index);
    
    setSoftware({ ...software, screenshots: newScreenshots });

    if (selectedImage === currentScreenshotUrl) {
      setSelectedImage(newScreenshots.length > 0 ? newScreenshots[0] : null);
    }
    if (isLightboxOpen && software.screenshots[lightboxCurrentImageIndex] === currentScreenshotUrl) {
      if (newScreenshots.length === 0) {
        setIsLightboxOpen(false);
      } else {
        setLightboxCurrentImageIndex(prevIdx => Math.min(prevIdx, newScreenshots.length - 1));
      }
    }
  };

  const openLightbox = (index: number) => {
    if (software && software.screenshots && software.screenshots[index]) {
      setLightboxCurrentImageIndex(index);
      setIsLightboxOpen(true);
    }
  };

  const handleLightboxPrev = () => {
    if (software && software.screenshots) {
      setLightboxCurrentImageIndex((prevIndex: number) => 
        (prevIndex - 1 + software.screenshots.length) % software.screenshots.length
      );
    }
  };

  const handleLightboxNext = () => {
    if (software && software.screenshots) {
      setLightboxCurrentImageIndex((prevIndex: number) => 
        (prevIndex + 1) % software.screenshots.length
      );
    }
  };

  if (!software) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">加载中...</div>
      </div>
    );
  }

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
                  src={software.icon_url}
                  alt={software.name}
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
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{software.name}</h1>
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                      {software.categories.name}
                    </span>
                    {software.operating_systems && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700">
                        {software.operating_systems.name}
                      </span>
                    )}
                    <button
                      onClick={handleStar}
                      disabled={isStarring}
                      className={clsx(
                        "flex items-center transition-all duration-300",
                        "rounded-full px-3 py-1",
                        isStarred ? [
                          "bg-yellow-50",
                          "text-yellow-500",
                        ] : [
                          "text-gray-400",
                          "hover:text-yellow-500",
                        ],
                        "transform hover:scale-110"
                      )}
                    >
                      <Star 
                        size={18} 
                        className={clsx(
                          isStarred && "fill-current",
                          "transition-all duration-500",
                          "hover:rotate-[360deg]"
                        )} 
                      />
                      <span className="ml-1 font-medium">{starCount}</span>
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-row items-center justify-start gap-3 mt-4 md:mt-0">
                  {software.tutorial_url && (
                    <button
                      onClick={() => window.open(software.tutorial_url, '_blank', 'noopener,noreferrer')}
                      className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
                      title="查看使用教程"
                    >
                      <BookOpen className="w-5 h-5" />
                      使用教程
                    </button>
                  )}

                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <Download className="w-5 h-5" />
                    {user ? '下载' : '登录下载'}
                  </button>
                </div>
              </div>

              <p className="mt-4 text-gray-600 leading-relaxed">
                {software.description}
              </p>
            </div>
          </div>

          {software.screenshots && software.screenshots.length > 0 && (
            <div className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">软件截图</h2>
              
              <div className="relative group">
                <div 
                  className="aspect-video rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={() => {
                    const currentIndex = software.screenshots.indexOf(selectedImage!);
                    if (currentIndex !== -1) {
                      openLightbox(currentIndex);
                    }
                  }}
                >
                  {selectedImage ? (
                    <img
                      src={selectedImage}
                      alt={`${software.name} screenshot`}
                      className="w-full h-full object-contain"
                      onError={() => {
                        if (selectedImage) {
                           const index = software.screenshots.indexOf(selectedImage);
                           if (index !== -1) handleImageError(index);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                </div>
                
                {software.screenshots.length > 1 && selectedImage && (
                  <button 
                    onClick={(e: React.MouseEvent) => { 
                      e.stopPropagation();
                      const currentIndex = software.screenshots.indexOf(selectedImage!);
                      const prevIndex = (currentIndex - 1 + software.screenshots.length) % software.screenshots.length;
                      setSelectedImage(software.screenshots[prevIndex]);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                    aria-label="上一张截图"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                
                {software.screenshots.length > 1 && selectedImage && (
                  <button 
                    onClick={(e: React.MouseEvent) => { 
                      e.stopPropagation();
                      const currentIndex = software.screenshots.indexOf(selectedImage!);
                      const nextIndex = (currentIndex + 1) % software.screenshots.length;
                      setSelectedImage(software.screenshots[nextIndex]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                    aria-label="下一张截图"
                  >
                    <ArrowRight size={20} />
                  </button>
                )}
                
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-4">
                  {software.screenshots.map((screenshot, index) => (
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
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AdModal 
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
        onDownload={handleActualDownload}
      />
      {software && software.screenshots && software.screenshots.length > 0 && (
        <ImageLightbox 
          isOpen={isLightboxOpen}
          screenshots={software.screenshots}
          currentIndex={lightboxCurrentImageIndex}
          onClose={() => setIsLightboxOpen(false)}
          onPrev={handleLightboxPrev}
          onNext={handleLightboxNext}
          altText={`Enlarged screenshot for ${software.name}`}
        />
      )}
    </div>
  );
};

export default SoftwareDetail;