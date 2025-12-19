import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, Clock, Download, Star, Monitor, Settings, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import Pagination from '../components/Pagination';
import { supabase, FALLBACK_STATS, FALLBACK_STAR_COUNTS } from '../lib/supabase';
import SoftwareCard from '../components/SoftwareCard';
import DonationSection from '../components/DonationSection';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import MessageBoard from '../components/MessageBoard';
import { DEFAULT_PREFERENCES } from '../contexts/AuthContext';
import AIAssistant from '../components/AIAssistant';
import { Helmet } from 'react-helmet';
import SupabaseStatusChecker from '../components/SupabaseStatusChecker';
import { useChatbot } from '../contexts/ChatbotContext';
import ChatbotLoader from '../components/ChatbotLoader';

interface Software {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  star_count: number;
  categories: {
    name: string;
  } | null;
  operating_systems: {
    name: string;
  } | null;
  created_at: string;
  direct_download_url?: string;
  cloud_download_url?: string;
  is_recommended?: boolean;
  category_name?: string;
  os_name?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface OperatingSystem {
  id: string;
  name: string;
  slug: string;
}

const Home = () => {
  const { user, userPreferences } = useAuth();
  const { isChatbotEnabled } = useChatbot();
  const navigate = useNavigate();
  const [software, setSoftware] = useState<Software[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [operatingSystems, setOperatingSystems] = useState<OperatingSystem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedOS, setSelectedOS] = useState('');
  const [activeTab, setActiveTab] = useState<'new' | 'recommended' | 'popular'>('new');
  const [platformStarCount, setPlatformStarCount] = useState(0);
  const [hasStarredPlatform, setHasStarredPlatform] = useState(false);
  const [isStarringPlatform, setIsStarringPlatform] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filteredSoftware, setFilteredSoftware] = useState<Software[]>([]);
  const [showNetworkWarning, setShowNetworkWarning] = useState(false);

  // 新增状态用于滚动和页码恢复
  const [initialPageRestored, setInitialPageRestored] = useState(false);
  const [scrollTarget, setScrollTarget] = useState<number | null>(null);

  // Ref to track if the component has mounted, for the filter useEffect
  const isFiltersEffectMounted = useRef(false);

  const ITEMS_PER_PAGE = user ? userPreferences.itemsPerPage : DEFAULT_PREFERENCES.itemsPerPage;

  // Effect 1: 组件挂载时运行，用于读取sessionStorage并启动数据加载
  useEffect(() => {
    const pageStr = sessionStorage.getItem('homeSoftwareCurrentPage');
    if (pageStr) {
      const restoredPage = parseInt(pageStr, 10);
      if (currentPage !== restoredPage) {
        setCurrentPage(restoredPage);
      }
      sessionStorage.removeItem('homeSoftwareCurrentPage'); // 读取后立即移除
    }
    setInitialPageRestored(true); // 标记页码恢复逻辑已执行

    const scrollStr = sessionStorage.getItem('homeSoftwareListScroll');
    if (scrollStr) {
      setScrollTarget(parseInt(scrollStr, 10));
      sessionStorage.removeItem('homeSoftwareListScroll'); // 读取后立即移除
    }

    // 初始数据加载
    loadCategories();
    loadOperatingSystems();
    loadSoftware();
    loadPlatformStarsCount();
  }, []); // 空依赖数组，仅在挂载时运行一次

  // Effect 2: 处理实际的滚动操作
  useEffect(() => {
    if (initialPageRestored && scrollTarget !== null && !loading) {
      const dataAvailable = (searchTerm || selectedCategory || selectedOS)
        ? filteredSoftware.length > 0
        : software.length > 0;

      if (dataAvailable) {
        const timeoutId = setTimeout(() => {
          window.scrollTo(0, scrollTarget);
          setScrollTarget(null); // 滚动后清除目标，避免重复滚动
        }, 100); // 短暂延迟以允许DOM绘制
        return () => clearTimeout(timeoutId);
      } else if (scrollTarget !== null && !loading) {
        // 如果没有数据但加载已完成 (例如，目标页面为空)，也清除滚动目标
        // 这样可以避免在没有内容的情况下尝试滚动，或在后续不相关的更新中错误地滚动
        setScrollTarget(null);
      }
    }
  }, [
    loading, 
    scrollTarget, 
    initialPageRestored, 
    software, 
    filteredSoftware, 
    searchTerm, 
    selectedCategory, 
    selectedOS
  ]);

  useEffect(() => {
    if (user) {
      checkIfPlatformStarred();
    }
  }, [user]);

  useEffect(() => {
    // Only proceed if initial page restoration attempt has been made.
    if (!initialPageRestored) {
      return; // Do nothing if we haven't even tried to restore the page yet.
    }

    if (isFiltersEffectMounted.current) {
      // This is an update caused by filter change, not initial mount for this effect after restoration
      setCurrentPage(1);
      loadFilteredSoftware();
    } else {
      // This is the first run of this effect AFTER initialPageRestored became true.
      // Mark this effect as "mounted" in the context of filters being changeable.
      isFiltersEffectMounted.current = true;
      // We don't reset page or load filtered software here because this run is due to
      // initialPageRestored becoming true, or initial filter values. Actual filter changes by user
      // will trigger the `if` block above on subsequent runs.
      // If filters *were* active upon returning (not typical for current setup),
      // the main data loading effect dependent on currentPage would handle loading them correctly.
    }
  }, [searchTerm, selectedCategory, selectedOS, initialPageRestored]); // Added initialPageRestored

  useEffect(() => {
    if (searchTerm || selectedCategory || selectedOS) {
      loadFilteredSoftware();
    } else {
      setTotalItems(getTabTotalPages());
    }
  }, [searchTerm, selectedCategory, selectedOS, currentPage, activeTab, software]);

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) setCategories(data);
  };

  const loadOperatingSystems = async () => {
    const { data } = await supabase.from('operating_systems').select('*');
    if (data) setOperatingSystems(data);
  };

  const loadSoftware = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('software')
        .select(`*, categories (name), operating_systems (name)`);

      if (error) {
        console.error('Error loading software:', error);
        return;
      }

      if (!data) return;

      let starCountMap: Record<string, number> = {};
      
      try {
        const { data: starCounts, error: starError } = await supabase.rpc('get_software_star_counts');
        
        if (starError) {
          console.error('Error loading star counts:', starError);
          setShowNetworkWarning(true);
          starCountMap = FALLBACK_STAR_COUNTS.reduce((acc: Record<string, number>, curr: any) => {
            acc[curr.software_id] = curr.star_count;
            return acc;
          }, {});
          
          data.forEach(item => {
            if (!starCountMap[item.id]) {
              starCountMap[item.id] = Math.floor(Math.random() * 5) + 1;
            }
          });
        } else {
          starCountMap = (starCounts || []).reduce((acc: Record<string, number>, curr: any) => {
            acc[curr.software_id] = curr.star_count;
            return acc;
          }, {});
        }
      } catch (starCountError) {
        console.error('Failed to fetch star counts:', starCountError);
        starCountMap = data.reduce((acc: Record<string, number>, item) => {
          acc[item.id] = Math.floor(Math.random() * 5) + 1;
          return acc;
        }, {});
      }

      const softwareWithStats = data.map(item => ({
        ...item,
        star_count: starCountMap[item.id] || 0
      }));

      setSoftware(softwareWithStats);
    } catch (error) {
      console.error('Error loading software:', error);
      toast.error('加载软件列表失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredSoftware = async () => {
    if (!searchTerm && !selectedCategory && !selectedOS) {
      setFilteredSoftware([]);
      setTotalItems(0);
      return;
    }

    try {
      setLoading(true);

      const { data: countData, error: countError } = await supabase.rpc(
        'count_filtered_software',
        {
          category_id_param: selectedCategory || null,
          os_id_param: selectedOS || null,
          search_term: searchTerm || null
        }
      );

      if (countError) {
        console.error('Error counting software:', countError);
        return;
      }

      setTotalItems(countData || 0);

      const { data, error } = await supabase.rpc(
        'get_paginated_software',
        {
          page_number: currentPage,
          items_per_page: ITEMS_PER_PAGE,
          category_id_param: selectedCategory || null,
          os_id_param: selectedOS || null,
          search_term: searchTerm || null
        }
      );

      if (error) {
        console.error('Error loading filtered software:', error);
        return;
      }

      const formattedData = data.map((item: any) => ({
        ...item,
        categories: { name: item.category_name },
        operating_systems: { name: item.os_name }
      }));

      setFilteredSoftware(formattedData || []);
    } catch (error) {
      console.error('Error loading filtered software:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlatformStarsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('platform_stars')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('加载平台总点赞数时出错:', error);
        setPlatformStarCount(FALLBACK_STATS.platform_stars || 20);
        return;
      }

      const starCount = Math.max(count || 0, FALLBACK_STATS.platform_stars || 20);
      setPlatformStarCount(starCount);
    } catch (error) {
      console.error('获取平台总点赞数失败:', error);
      setPlatformStarCount(FALLBACK_STATS.platform_stars || 20);
    }
  };

  const checkIfPlatformStarred = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('platform_stars')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('检查平台是否已点赞时出错:', error);
        setHasStarredPlatform(false);
        return;
      }
      setHasStarredPlatform(!!data);
    } catch (error) {
      console.error('检查平台是否已点赞时网络错误:', error);
      setHasStarredPlatform(false);
    }
  };

  const createFlyingStar = (x: number, y: number) => {
    const logo = document.querySelector('.logo-target') as HTMLElement;
    if (!logo) return;

    const logoRect = logo.getBoundingClientRect();
    const targetX = logoRect.left + (logoRect.width / 2);
    const targetY = logoRect.top + (logoRect.height / 2);

    const star = document.createElement('div');
    star.className = 'flying-star';
    star.style.left = `${x}px`;
    star.style.top = `${y}px`;
    
    const angle = Math.atan2(targetY - y, targetX - x) * (180 / Math.PI);
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', '#EAB308');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z');
    path.setAttribute('fill', '#EAB308');
    
    svg.appendChild(path);
    star.appendChild(svg);
    
    star.style.transform = `rotate(${angle}deg)`;
    star.style.setProperty('--target-x', `${targetX}px`);
    star.style.setProperty('--target-y', `${targetY}px`);
    
    document.body.appendChild(star);
    
    star.addEventListener('animationend', () => {
      document.body.removeChild(star);
    });
  };

  const handlePlatformStar = async (e: React.MouseEvent) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (isStarringPlatform) return;
    setIsStarringPlatform(true);

    try {
      if (hasStarredPlatform) {
        const { error } = await supabase
          .from('platform_stars')
          .delete()
          .eq('user_id', user.id);

        if (error) throw error;
        
        setPlatformStarCount(prev => Math.max(FALLBACK_STATS.platform_stars || 20, prev - 1));
        setHasStarredPlatform(false);
        toast.success('已取消点赞平台');
      } else {
        const { error } = await supabase
          .from('platform_stars')
          .insert({ 
            user_id: user.id,
          });

        if (error) {
          console.error('为平台添加星标时出错:', error);
          throw error;
        }
        
        setPlatformStarCount(prev => prev + 1);
        setHasStarredPlatform(true);
        createFlyingStar(e.clientX, e.clientY);
        toast.success('感谢您点赞平台！');
        loadPlatformStarsCount();
      }
    } catch (error) {
      console.error('切换平台星标时出错:', error);
      toast.error('操作失败，请稍后重试');
    } finally {
      setIsStarringPlatform(false);
    }
  };

  const handleDownload = async (software: Software) => {
    const url = software.direct_download_url || software.cloud_download_url;
    window.open(url, '_blank');
  };

  const getNewReleases = () => {
    const sorted = [...software].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const getEditorsPicks = () => {
    const filtered = software.filter(item => item.is_recommended);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const getMostDownloaded = () => {
    const sorted = [...software].sort((a, b) => (b.star_count || 0) - (a.star_count || 0));
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const getTabTotalPages = () => {
    switch (activeTab) {
      case 'new':
        return Math.ceil(software.length / ITEMS_PER_PAGE);
      case 'recommended':
        return Math.ceil(software.filter(item => item.is_recommended).length / ITEMS_PER_PAGE);
      case 'popular':
        return Math.ceil(software.length / ITEMS_PER_PAGE);
      default:
        return 1;
    }
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const TabButton = ({ type, icon: Icon, label }: { type: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => {
        setCurrentPage(1);
        setActiveTab(type);
      }}
      className={clsx(
        "flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300",
        "backdrop-blur-lg",
        activeTab === type ? [
          "bg-gradient-to-r from-blue-500/90 to-blue-600/90 text-white",
          "shadow-[0_8px_16px_-4px_rgba(59,130,246,0.3)]",
          "scale-105",
        ] : [
          "bg-white/80 text-gray-600 hover:bg-gray-50/90",
          "hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)]",
          "hover:scale-102",
        ]
      )}
    >
      <Icon className={clsx(
        "w-5 h-5 transition-transform duration-300",
        activeTab === type ? [
          "text-white rotate-0",
          "transform-gpu",
        ] : [
          "text-gray-400 group-hover:rotate-12",
          "transform-gpu",
        ]
      )} />
      <span className="font-medium">{label}</span>
    </button>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex justify-center items-center mt-8 space-x-4">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className={clsx(
            "flex items-center justify-center w-10 h-10 rounded-full",
            "transition-all duration-300",
            currentPage === 1 ? [
              "bg-gray-100 text-gray-400 cursor-not-allowed"
            ] : [
              "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-500",
              "shadow-sm hover:shadow"
            ]
          )}
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="text-gray-700">
          <span className="font-medium">{currentPage}</span>
          <span className="mx-1">/</span>
          <span>{totalPages}</span>
        </div>
        
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className={clsx(
            "flex items-center justify-center w-10 h-10 rounded-full",
            "transition-all duration-300",
            currentPage === totalPages ? [
              "bg-gray-100 text-gray-400 cursor-not-allowed"
            ] : [
              "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-500",
              "shadow-sm hover:shadow"
            ]
          )}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    );
  };

  if (loading && !software.length) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-500 animate-pulse">加载中...</div>
      </div>
    );
  }

  const renderSoftwareCard = (item: Software, pageNum: number) => (
    <SoftwareCard
      key={item.id}
      id={item.id}
      name={item.name}
      description={item.description}
      iconUrl={item.icon_url}
      starCount={item.star_count}
      category={item.categories?.name || item.category_name || '未分类'}
      operatingSystem={item.operating_systems?.name || item.os_name}
      onDownload={() => handleDownload(item)}
      currentPageForNav={pageNum}
    />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-6">
      <Helmet>
        <title>WE Tools - 实用工具和网站推荐</title>
        <meta name="description" content="发现最好用的工具和网站资源，轻松找到高效率软件" />
      </Helmet>

      <SupabaseStatusChecker show={showNetworkWarning} />

      <ChatbotLoader 
        conversationStarters={[
          {prompt: '我想找一个快捷截图的软件？'},
          {prompt: '我想找几个学编程的网站？'},
          {prompt: '给我推荐几个免费下载游戏的网站?'},
        ]}
      />

      <div className="max-w-7xl mx-auto">
        {/* 网站导航按钮 */}
        <div className="mb-8">
          <Link 
            to="/websites"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg shadow-md transition-all duration-300"
          >
            <Globe size={18} />
            <span>网站导航</span>
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            发现优质软件
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto mt-4">
            WE Tools 为您精选优质软件，让工作和生活更轻松
          </p>
          <p className="text-gray-600 max-w-2xl mx-auto mt-4">
            部分工具需要魔法工具，本站"不推荐"，"不提供"，"不支持"，用户需自备
          </p>
          <button
            onClick={handlePlatformStar}
            disabled={isStarringPlatform}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 rounded-xl mx-auto mt-6",
              "transition-all duration-300",
              "backdrop-blur-lg",
              hasStarredPlatform ? [
                "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500",
                "animate-gradient-x",
                "text-white",
                "shadow-[0_8px_16px_-4px_rgba(245,158,11,0.3)]",
              ] : [
                "bg-white/80 text-gray-600",
                "hover:bg-amber-50/90",
                "hover:text-amber-500",
                "hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)]",
              ],
              "hover:scale-105",
              "active:scale-95"
            )}
          >
            <Star 
              className={clsx(
                "w-5 h-5 transition-all duration-300",
                hasStarredPlatform && "fill-current"
              )} 
            />
            <span className="font-medium">
              {hasStarredPlatform ? '已点赞' : '点赞支持'} ({platformStarCount})
            </span>
          </button>
        </div>

        {/* 搜索框 */}
        <div className="relative max-w-2xl mx-auto mb-8">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-5 h-5" />
          <input
            type="text"
            placeholder="搜索软件名称或描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/80 backdrop-blur-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* 分类和系统筛选 */}
        <div className="flex flex-col gap-4 mb-8">
          {/* 分类筛选 */}
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setSelectedCategory('')}
              className={clsx(
                "px-4 py-2 rounded-full transition-all",
                !selectedCategory ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white" : "bg-white/80 text-gray-600 hover:bg-blue-50"
              )}
            >
              全部分类
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={clsx(
                  "px-4 py-2 rounded-full transition-all",
                  selectedCategory === category.id ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white" : "bg-white/80 text-gray-600 hover:bg-blue-50"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* 系统筛选 */}
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setSelectedOS('')}
              className={clsx(
                "px-4 py-2 rounded-full transition-all",
                !selectedOS ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white" : "bg-white/80 text-gray-600 hover:bg-purple-50"
              )}
            >
              全部系统
            </button>
            {operatingSystems.map((os) => (
              <button
                key={os.id}
                onClick={() => setSelectedOS(os.id)}
                className={clsx(
                  "px-4 py-2 rounded-full transition-all",
                  selectedOS === os.id ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white" : "bg-white/80 text-gray-600 hover:bg-purple-50"
                )}
              >
                {os.name}
              </button>
            ))}
          </div>
        </div>

        {/* 标签页切换 */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('new')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
              activeTab === 'new' ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white" : "bg-white/80 text-gray-600 hover:bg-blue-50"
            )}
          >
            <Clock className="w-5 h-5" />
            最近上新
          </button>
          <button
            onClick={() => setActiveTab('recommended')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
              activeTab === 'recommended' ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white" : "bg-white/80 text-gray-600 hover:bg-blue-50"
            )}
          >
            <Sparkles className="w-5 h-5" />
            小编推荐
          </button>
          <button
            onClick={() => setActiveTab('popular')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
              activeTab === 'popular' ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white" : "bg-white/80 text-gray-600 hover:bg-blue-50"
            )}
          >
            <Download className="w-5 h-5" />
            多数人下载
          </button>
        </div>

        {!searchTerm && !selectedCategory && !selectedOS && (
          <div className="space-y-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${currentPage}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {activeTab === 'new' && getNewReleases().map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {renderSoftwareCard(item, currentPage)}
                  </motion.div>
                ))}
                {activeTab === 'recommended' && getEditorsPicks().map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {renderSoftwareCard(item, currentPage)}
                  </motion.div>
                ))}
                {activeTab === 'popular' && getMostDownloaded().map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {renderSoftwareCard(item, currentPage)}
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
            
            <Pagination
              currentPage={currentPage}
              totalPages={getTabTotalPages()}
              onPageChange={(page) => {
                setCurrentPage(page);
              }}
              isLoading={loading}
            />
          </div>
        )}

        {(searchTerm || selectedCategory || selectedOS) && (
          <div className="space-y-4">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-semibold text-gray-900"
            >
              搜索结果
            </motion.h2>
            {loading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-[40vh] flex items-center justify-center"
              >
                <div className="text-gray-500 animate-pulse">加载中...</div>
              </motion.div>
            ) : filteredSoftware.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-[40vh] flex items-center justify-center"
              >
                <div className="text-gray-500">没有找到匹配的软件</div>
              </motion.div>
            ) : (
              <>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${searchTerm}-${selectedCategory}-${selectedOS}-${currentPage}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {filteredSoftware.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        {renderSoftwareCard(item, currentPage)}
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                  }}
                  isLoading={loading}
                />
              </>
            )}
          </div>
        )}

        {/* 支持我们 */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent mb-4">支持我们</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">软件全部免费，如果您觉得 WE Tools 对您有所帮助，欢迎赞助我们，帮助我们提供更好的服务！</p>
          
          <div className="flex flex-col md:flex-row justify-center gap-12">
            {/* 支付宝 */}
            <div className="bg-white/80 backdrop-blur-lg p-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 w-full md:w-[420px]">
              <button
                className="mb-6 px-10 py-3 text-lg bg-gradient-to-r from-blue-500/90 to-blue-600/90 text-white rounded-full hover:shadow-[0_8px_16px_-4px_rgba(59,130,246,0.3)] transition-all duration-300 hover:scale-105"
              >
                推荐使用支付宝
              </button>
              <div className="w-80 h-80 bg-white border border-gray-200 rounded-xl overflow-hidden mx-auto">
                <img 
                  src="https://gitee.com/wctw-hub/picture/raw/main/blog/AliPay.webp" 
                  alt="支付宝二维码" 
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="mt-6 text-gray-600 text-base">一丝不苟的沙漠一只雕 (*^▽^*)</p>
            </div>

            {/* 微信支付 */}
            <div className="bg-white/80 backdrop-blur-lg p-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 w-full md:w-[420px]">
              <button
                className="mb-6 px-10 py-3 text-lg bg-gradient-to-r from-green-500/90 to-green-600/90 text-white rounded-full hover:shadow-[0_8px_16px_-4px_rgba(34,197,94,0.3)] transition-all duration-300 hover:scale-105"
              >
                推荐使用微信支付
              </button>
              <div className="w-80 h-80 bg-white border border-gray-200 rounded-xl overflow-hidden mx-auto">
                <img 
                  src="https://gitee.com/wctw-hub/picture/raw/main/blog/wechatPay.webp" 
                  alt="微信支付二维码" 
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="mt-6 text-gray-600 text-base">烟火泛滥 (*^▽^*)</p>
            </div>
          </div>

          <div className="mt-8 text-gray-500 text-sm max-w-2xl mx-auto">
            软件如有侵权，请联系下架。联系邮箱：junqianxi.hub@gmail.com
          </div>
        </div>

        {/* 底部区域 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 py-12 px-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl">
          {/* 免责声明 */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">免责声明</h3>
            <div className="space-y-2 text-gray-600 text-sm">
              <p>本网站所提供的所有软件和工具仅供学习和研究使用，请勿用于任何商业用途。</p>
              <p>用户在使用本网站服务的过程中应遵守相关法律法规，不得从事违法违规行为。</p>
              <p>本站信息来自网络，版权争议与本站无关。您必须在下载后的24个小时之内，从您的电脑中彻底删除上述内容。如果您喜欢该程序，请支持正版软件，购买注册，得到更好的正版服务。</p>
              <p>如有侵权请与我们联系处理。</p>
            </div>
          </div>

          {/* 联系我们 */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">联系我们</h3>
            <div className="space-y-2 text-gray-600 text-sm">
              <p><a href="https://blog.wctw.fun/" className="block hover:text-blue-500 transition-colors">博客：沙漠一只雕</a></p>
              <p><a href="https://mail.google.com/mail/u/0/?fs=1&to=junqianxi.hub@gmail.com&tf=cm" className="block hover:text-blue-500 transition-colors">邮箱：junqianxi.hub@gmail.com</a></p>
              <p>微信公众号：wctw.hub</p>
              <div className="mt-4">
                <img 
                  src="https://gitee.com/wctw-hub/picture/raw/main/blog/QR.webp" 
                  alt="微信公众号二维码" 
                  className="w-32 h-32 mx-auto"
                />
              </div>
            </div>
          </div>

          {/* 法律信息 */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">法律信息</h3>
            <div className="space-y-2 text-gray-600 text-sm">
              <p>本网站由 WE Tools 团队运营维护，使用本网站即表示您同意遵守我们的服务条款和隐私政策。</p>
              <p>© 2025 WE Tools. 保留所有权利。</p>
              <p><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">豫ICP备2024099994号-1</a></p>
              <div className="space-y-1 mt-4">
                <a href="/terms" className="block hover:text-blue-500 transition-colors">服务条款</a>
                <a href="/privacy" className="block hover:text-blue-500 transition-colors">隐私政策</a>
                <a href="/disclaimer" className="block hover:text-blue-500 transition-colors">完整免责声明</a>
              </div>
            </div>
          </div>
        </div>

        {/* 留言板 */}
        <MessageBoard />
      </div>
    </div>
  );
};

export default Home;