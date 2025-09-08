import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, Clock, ArrowUp, Monitor, Settings, ArrowLeft, Save, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import Pagination from '../components/Pagination';
import { supabase } from '../lib/supabase';
import WebsiteCard from '../components/WebsiteCard';
import DonationSection from '../components/DonationSection';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { DEFAULT_PREFERENCES } from '../contexts/AuthContext';
import { Helmet } from 'react-helmet';

// 备用网站数据
const FALLBACK_WEBSITES = [
  {
    id: "1",
    name: "GitHub",
    description: "GitHub是世界上最大的代码托管平台，提供Git版本控制和协作功能。",
    icon_url: "https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png",
    url: "https://github.com",
    category_name: "开发工具",
    created_at: "2023-01-01T00:00:00.000Z",
    is_recommended: true,
    starCount: 0,
    isStarred: false
  },
  {
    id: "2",
    name: "Stack Overflow",
    description: "Stack Overflow是一个编程问答网站，程序员可以在这里提问并获得答案。",
    icon_url: "https://cdn.sstatic.net/Sites/stackoverflow/Img/apple-touch-icon.png",
    url: "https://stackoverflow.com",
    category_name: "开发社区",
    created_at: "2023-01-02T00:00:00.000Z",
    is_recommended: true,
    starCount: 0,
    isStarred: false
  },
  {
    id: "3",
    name: "MDN Web Docs",
    description: "MDN Web Docs提供有关Web标准、JavaScript、CSS和HTML的全面文档。",
    icon_url: "https://developer.mozilla.org/apple-touch-icon.6803c6f0.png",
    url: "https://developer.mozilla.org",
    category_name: "文档资源",
    created_at: "2023-01-03T00:00:00.000Z",
    is_recommended: true,
    starCount: 0,
    isStarred: false
  },
  {
    id: "4",
    name: "Tailwind CSS",
    description: "Tailwind CSS是一个实用为先的CSS框架，用于快速构建现代网站。",
    icon_url: "https://tailwindcss.com/favicons/apple-touch-icon.png",
    url: "https://tailwindcss.com",
    category_name: "前端框架",
    created_at: "2023-01-04T00:00:00.000Z",
    is_recommended: false,
    starCount: 0,
    isStarred: false
  },
  {
    id: "5",
    name: "React",
    description: "React是用于构建用户界面的JavaScript库，由Facebook开发和维护。",
    icon_url: "https://reactjs.org/favicon.ico",
    url: "https://reactjs.org",
    category_name: "前端框架",
    created_at: "2023-01-05T00:00:00.000Z",
    is_recommended: true,
    starCount: 0,
    isStarred: false
  },
  {
    id: "6",
    name: "Vue.js",
    description: "Vue.js是一个渐进式JavaScript框架，用于构建用户界面。",
    icon_url: "https://vuejs.org/images/logo.png",
    url: "https://vuejs.org",
    category_name: "前端框架",
    created_at: "2023-01-06T00:00:00.000Z",
    is_recommended: false,
    starCount: 0,
    isStarred: false
  },
  {
    id: "7",
    name: "Node.js",
    description: "Node.js是基于Chrome V8引擎的JavaScript运行时，用于构建服务器端应用程序。",
    icon_url: "https://nodejs.org/static/images/logo.svg",
    url: "https://nodejs.org",
    category_name: "后端技术",
    created_at: "2023-01-07T00:00:00.000Z",
    is_recommended: true,
    starCount: 0,
    isStarred: false
  },
  {
    id: "8",
    name: "TypeScript",
    description: "TypeScript是JavaScript的超集，添加了静态类型定义，提高了开发体验。",
    icon_url: "https://www.typescriptlang.org/favicon.ico",
    url: "https://www.typescriptlang.org",
    category_name: "编程语言",
    created_at: "2023-01-08T00:00:00.000Z",
    is_recommended: true,
    starCount: 0,
    isStarred: false
  },
  {
    id: "9",
    name: "VS Code",
    description: "Visual Studio Code是一个轻量级但功能强大的源代码编辑器。",
    icon_url: "https://code.visualstudio.com/favicon.ico",
    url: "https://code.visualstudio.com",
    category_name: "开发工具",
    created_at: "2023-01-09T00:00:00.000Z",
    is_recommended: true,
    starCount: 0,
    isStarred: false
  }
];

// 备用分类数据
const FALLBACK_CATEGORIES = [
  {
    id: "1",
    name: "开发工具",
    slug: "dev-tools"
  },
  {
    id: "2",
    name: "前端框架",
    slug: "frontend-frameworks"
  },
  {
    id: "3", 
    name: "后端技术",
    slug: "backend-tech"
  },
  {
    id: "4",
    name: "开发社区",
    slug: "dev-community"
  },
  {
    id: "5",
    name: "文档资源",
    slug: "documentation"
  },
  {
    id: "6",
    name: "编程语言",
    slug: "programming-languages"
  }
];

interface Website {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  url: string;
  category_name?: string;
  created_at: string;
  is_recommended?: boolean;
  starCount: number;
  isStarred?: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const WebsiteDirectory = () => {
  const { user, userPreferences } = useAuth();
  const navigate = useNavigate();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeTab, setActiveTab] = useState<'new' | 'recommended' | 'popular'>('new');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filteredWebsites, setFilteredWebsites] = useState<Website[]>([]);
  const [showNetworkWarning, setShowNetworkWarning] = useState(false);
  const [preferencesJustSaved, setPreferencesJustSaved] = useState(false);

  // States and Ref for page/scroll restoration (aligned with Home.tsx)
  const [initialPageRestored, setInitialPageRestored] = useState(false);
  const [scrollTarget, setScrollTarget] = useState<number | null>(null);
  const isFiltersEffectMounted = useRef(false); 

  // 使用用户设置的每页显示数量，未登录用户使用默认值
  const ITEMS_PER_PAGE = user ? userPreferences.itemsPerPage : DEFAULT_PREFERENCES.itemsPerPage;

  useEffect(() => {
    // 1. Attempt to restore page number first
    const pageStr = sessionStorage.getItem('websiteNavPageCurrentPage');
    if (pageStr) {
      const restoredPage = parseInt(pageStr, 10);
      // setCurrentPage 应该在这里，initialPageRestored 会阻止其他 effects 过早运行
      setCurrentPage(restoredPage);
      sessionStorage.removeItem('websiteNavPageCurrentPage'); 
    }

    // 2. Attempt to restore scroll position
    const scrollStr = sessionStorage.getItem('websiteNavPageScroll');
    if (scrollStr) {
      setScrollTarget(parseInt(scrollStr, 10));
      sessionStorage.removeItem('websiteNavPageScroll'); 
    }
    
    // 关键：在尝试恢复滚动和加载数据之前，标记页面恢复尝试已完成
    setInitialPageRestored(true); 

    // 3. Load initial data
    loadCategories();
    loadWebsites(); // 初始数据加载
  }, []); // 空依赖数组，仅在挂载时运行一次

  // 处理筛选条件变化的 useEffect (searchTerm, selectedCategory)
  useEffect(() => {
    if (!initialPageRestored) {
      return; // 如果尚未完成初始恢复，则不执行
    }

    if (isFiltersEffectMounted.current) {
      // 用户在初始加载/恢复后更改了筛选条件
      setCurrentPage(1); // 重置到第一页
      loadFilteredWebsites();
    } else {
      // 这是 initialPageRestored 变为 true 后的第一次运行。
      // 如果 searchTerm 或 selectedCategory 已设置 (例如，从URL参数恢复或持久化状态)，
      // 则加载筛选后的数据，但要遵循可能已恢复的 currentPage。
      if (searchTerm || selectedCategory) {
         loadFilteredWebsites(); // loadFilteredWebsites 应使用当前的 `currentPage`
      }
      isFiltersEffectMounted.current = true; // 标记此 effect 已运行一次
    }
  }, [searchTerm, selectedCategory, initialPageRestored]); // 添加 initialPageRestored

  // 新增: 处理滚动恢复的 useEffect
  useEffect(() => {
    // 根据筛选条件是否激活来确定要考虑的数据
    const dataToConsider = searchTerm || selectedCategory ? filteredWebsites : websites;

    if (initialPageRestored && scrollTarget !== null && !loading && dataToConsider.length > 0) {
      setTimeout(() => {
        window.scrollTo(0, scrollTarget);
        setScrollTarget(null); // 滚动后重置
      }, 100); // 延迟以允许DOM更新
    } else if (initialPageRestored && scrollTarget !== null && !loading && dataToConsider.length === 0) {
      // 如果加载完成但没有数据 (例如，筛选器没有结果)，也重置 scrollTarget
      setScrollTarget(null);
    }
  }, [loading, scrollTarget, initialPageRestored, websites, filteredWebsites, searchTerm, selectedCategory]);

  // 处理 currentPage 或 activeTab 变化的 useEffect (当没有筛选时)
  useEffect(() => {
    if (!initialPageRestored) {
      return; // 如果尚未完成初始恢复，则不执行
    }

    // 如果筛选条件激活，则数据加载由筛选条件变化的 useEffect 处理。
    // 此 effect 处理未筛选数据的加载和分页，
    // 或当现有筛选条件的 currentPage 发生变化时。
    if (searchTerm || selectedCategory) {
        loadFilteredWebsites(); // 处理已筛选数据的分页
    } else {
        loadWebsites(); // 处理基于 activeTab 的未筛选数据的分页
        // 如果不是在恢复滚动位置，并且标签页/页码发生变化 (未筛选模式)，则滚动到顶部
        if (scrollTarget === null) { 
            window.scrollTo(0, 0);
        }
    }
  // 确保所有触发数据加载或影响其参数的相关依赖项都包括在内。
  // activeTab 变化应通过 loadWebsites 触发重新获取。
  // currentPage 变化应触发筛选或未筛选数据的重新获取。
  // initialPageRestored 是防止过早运行的关键。
  }, [currentPage, activeTab, initialPageRestored]);

  const loadCategories = async () => {
    try {
      // 先尝试从Supabase获取数据
      const { data, error } = await supabase.from('website_categories').select('*');
      
      if (error) {
        console.error('Error loading categories:', error);
        // 如果出错，使用备用数据
        setCategories(FALLBACK_CATEGORIES);
        setShowNetworkWarning(true);
        return;
      }
      
      if (data && data.length > 0) {
        setCategories(data);
      } else {
        // 如果没有数据，使用备用数据
        setCategories(FALLBACK_CATEGORIES);
        setShowNetworkWarning(true);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // 发生异常时，使用备用数据
      setCategories(FALLBACK_CATEGORIES);
      setShowNetworkWarning(true);
    }
  };

  const loadWebsites = async () => {
    try {
      setLoading(true);
      
      // 尝试从Supabase获取数据
      const { data: websitesData, error: websitesError } = await supabase
        .from('websites')
        .select('*')
        .order('created_at', { ascending: false });

      if (websitesError) {
        console.error('Error loading websites:', websitesError);
        const fallbackWithStars = FALLBACK_WEBSITES.map(fb => ({...fb, starCount: fb.starCount || 0, isStarred: fb.isStarred || false}));
        setWebsites(fallbackWithStars);
        setTotalItems(fallbackWithStars.length);
        setShowNetworkWarning(true);
        return;
      }

      if (websitesData && websitesData.length > 0) {
        console.log('成功从数据库加载网站数据:', websitesData.length, '条');
        setShowNetworkWarning(false); // 成功加载时隐藏警告

        // Fetch star counts
        const { data: starCountsData, error: starCountsError } = await supabase
          .rpc('get_website_star_counts'); // Assuming this RPC exists and returns [{ website_id: string, star_count: number }]
        
        if (starCountsError) {
          console.error('Error fetching star counts:', starCountsError);
          // Continue without star counts or handle differently
        }

        let userStarredWebsites: string[] = [];
        if (user) {
          const { data: userStarsData, error: userStarsError } = await supabase
            .from('website_stars')
            .select('website_id')
            .eq('user_id', user.id);
          if (userStarsError) {
            console.error('Error fetching user starred websites:', userStarsError);
          } else {
            userStarredWebsites = userStarsData.map(star => star.website_id);
          }
        }

        const websitesWithStars = websitesData.map(item => {
          const starInfo = starCountsData?.find((sc: any) => sc.website_id === item.id);
          return {
            ...item,
            category_name: item.category_name || '未分类',
            starCount: starInfo ? starInfo.star_count : 0,
            isStarred: user ? userStarredWebsites.includes(item.id) : false,
          };
        });

        setWebsites(websitesWithStars);
        setTotalItems(websitesWithStars.length);
      } else {
        // 如果没有数据，使用备用数据
        console.log('数据库中没有网站数据，使用备用数据');
        setWebsites(FALLBACK_WEBSITES);
        setTotalItems(FALLBACK_WEBSITES.length);
        setShowNetworkWarning(true);
      }
    } catch (error) {
      console.error('Error loading websites:', error);
      // 发生异常时，使用备用数据
      setWebsites(FALLBACK_WEBSITES);
      setTotalItems(FALLBACK_WEBSITES.length);
      setShowNetworkWarning(true);
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredWebsites = async () => {
    if (!searchTerm && !selectedCategory) {
      setFilteredWebsites([]);
      setTotalItems(websites.length);
      return;
    }

    try {
      setLoading(true);

      // 使用本地数据筛选，避免数据库查询错误
      let filtered = [...websites];
      
      if (selectedCategory) {
        filtered = filtered.filter(site => 
          site.category_name === categories.find(cat => cat.id === selectedCategory)?.name
        );
      }
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(site => 
          site.name.toLowerCase().includes(term) || 
          site.description.toLowerCase().includes(term)
        );
      }

      setFilteredWebsites(filtered);
      setTotalItems(filtered.length);
    } catch (error) {
      console.error('Error filtering websites:', error);
      setFilteredWebsites([]);
      setShowNetworkWarning(true);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    if (searchTerm || selectedCategory) {
      return filteredWebsites;
    }

    let filtered = [...websites];

    // Apply tab filter
    switch (activeTab) {
      case 'new':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'recommended':
        filtered = filtered.filter(item => item.is_recommended);
        break;
      case 'popular':
        // 按星星数量从多到少排序
        filtered.sort((b, a) => a.starCount - b.starCount);
        break;
      default:
        break;
    }

    return filtered;
  };

  const paginatedData = () => {
    const filteredData = getFilteredData();
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredData.slice(start, end);
  };

  const getTabTotalPages = () => {
    const filteredData = getFilteredData();
    return filteredData.length;
  };

  const handleTabChange = (tab: 'new' | 'recommended' | 'popular') => {
    if (!initialPageRestored) return; // 添加保护
    setActiveTab(tab);
    setCurrentPage(1);
    // 滚动到顶部由 [currentPage, activeTab] useEffect 在 scrollTarget 为 null 时处理
  };

  const handleCategoryChange = (categoryId: string) => {
    if (!initialPageRestored) return; // 添加保护
    setSelectedCategory(categoryId === selectedCategory ? '' : categoryId);
    // setCurrentPage(1) 由 [searchTerm, selectedCategory] useEffect 处理
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!initialPageRestored) return; // 添加保护
    setSearchTerm(e.target.value);
    // setCurrentPage(1) 由 [searchTerm, selectedCategory] useEffect 处理
  };

  const handlePageChange = (page: number) => {
    if (!initialPageRestored) return; // 添加保护
    setCurrentPage(page);
    // 滚动到顶部由 [currentPage, activeTab] useEffect 在 scrollTarget 为 null 时处理
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-6">
      <Helmet>
        <title>WE Tools - 网站导航</title>
        <meta name="description" content="发现优质的网站资源，提高您的工作效率和浏览体验" />
        <script src="https://o.alicdn.com/appflow/chatbot/v1/AppflowChatSDK.js"></script>
        <script>
          {`
            window.addEventListener('load', function() {
              if (window.APPFLOW_CHAT_SDK) {
                window.APPFLOW_CHAT_SDK.init({
                  integrateConfig: {
                    integrateId: 'cit-623ebc0d2f4b4279bf06',
                    domain: {
                      requestDomain: 'http://ai.wetools.wctw.fun'
                    },
                    draggable: true
                  }
                });
              }
            });
          `}
        </script>
      </Helmet>

      <div className="max-w-7xl mx-auto">
        {/* 返回软件按钮 */}
        <div className="mb-8">
          <Link 
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition-all duration-300"
          >
            <ArrowLeft size={18} />
            <span>返回软件</span>
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-5">网站导航</h1>
          <p className="text-0.5xl text-[#4b5563] max-w-3xl mx-auto font-medium">
            发现优质的网站资源，提高您的工作效率和浏览体验
          </p>
          <p className="text-gray-600 max-w-2xl mx-auto mt-4">
            部分工具需要魔法工具，本站"不推荐"，"不提供"，"不支持"，用户需自备
          </p>
        </div>

        {showNetworkWarning && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Settings className="h-5 w-5 text-amber-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-700">
                  网络连接不稳定或数据库表不存在，正在显示离线示例数据。
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="搜索网站..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={resetFilters}
                className={clsx(
                  "px-4 py-2 rounded-lg border",
                  (searchTerm || selectedCategory) 
                    ? "border-red-300 text-red-600 hover:bg-red-50" 
                    : "border-gray-200 text-gray-400 cursor-not-allowed"
                )}
                disabled={!searchTerm && !selectedCategory}
              >
                重置筛选
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={clsx(
                    "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                    selectedCategory === category.id
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                      : "bg-[#fcfdff] text-gray-700 hover:bg-gray-100 border border-gray-200"
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-gray-200 mb-6">
            <nav className="flex -mb-px space-x-8">
              <button
                onClick={() => handleTabChange('new')}
                className={clsx(
                  "py-4 px-1 border-b-2 font-medium text-sm flex items-center",
                  activeTab === 'new'
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Clock className="mr-2 h-5 w-5" />
                最新网站
              </button>
              <button
                onClick={() => handleTabChange('recommended')}
                className={clsx(
                  "py-4 px-1 border-b-2 font-medium text-sm flex items-center",
                  activeTab === 'recommended'
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                推荐网站
              </button>
              <button
                onClick={() => handleTabChange('popular')}
                className={clsx(
                  "py-4 px-1 border-b-2 font-medium text-sm flex items-center",
                  activeTab === 'popular'
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <ArrowUp className="mr-2 h-5 w-5" />
                热门网站
              </button>
            </nav>
          </div>

          <AnimatePresence>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="loader rounded-full border-4 border-t-4 border-gray-200 border-t-blue-500 w-12 h-12 animate-spin"></div>
              </div>
            ) : paginatedData().length === 0 ? (
              <div className="py-12 text-center">
                <Monitor className="mx-auto h-16 w-16 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">没有找到网站</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || selectedCategory ? '请尝试其他搜索条件' : '暂时没有网站数据'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedData().map((website) => (
                  <motion.div
                    key={website.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <WebsiteCard
                      id={website.id}
                      name={website.name}
                      description={website.description}
                      iconUrl={website.icon_url}
                      category={website.category_name || '未知分类'}
                      url={website.url}
                      starCount={website.starCount || 0}
                      initialIsStarred={website.isStarred || false}
                      currentPageForNav={currentPage}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {totalItems > ITEMS_PER_PAGE && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalItems / ITEMS_PER_PAGE)}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>

        <DonationSection />

        {/* 底部区域 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 py-12 px-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl">
          {/* 免责声明 */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">免责声明</h3>
            <div className="space-y-2 text-gray-600 text-sm">
              <p>本网站所提供的所有软件和工具仅供学习和研究使用，请勿用于任何商业用途。</p>
              <p>用户在使用本网站服务的过程中应遵守相关法律法规，不得从事违法违规行为，对于因用户使用不当或违规操作导致的任何损失，本网站概不负责。</p>
              <p>本网站展示的第三方软件的所有权归其各自所有者所有，如有侵权请联系我们，我们将及时处理。</p>
            </div>
          </div>

          {/* 联系我们 */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">联系我们</h3>
            <div className="space-y-2 text-gray-600 text-sm">
              <p><a href="https://blog.wctw.fun/">博客：沙漠一只雕</a></p>
              <p><a href="https://mail.google.com/mail/u/0/?fs=1&to=junqianxi.hub@gmail.com&tf=cm">邮箱：junqianxi.hub@gmail.com</a></p>
              <p>微信公众号：wctw.hub</p>
              <div className="mt-4">
                <img 
                  src="https://wangzaiwang.oss-cn-beijing.aliyuncs.com/image/QR.webp" 
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
              <p>鄂ICP备2024099994号</p>
              <div className="space-y-1 mt-4">
                <a href="/terms" className="block hover:text-blue-500 transition-colors">服务条款</a>
                <a href="/privacy" className="block hover:text-blue-500 transition-colors">隐私政策</a>
                <a href="/disclaimer" className="block hover:text-blue-500 transition-colors">完整免责声明</a>
              </div>
            </div>
          </div>
        </div>

        {/* 网络警告 */}
        {showNetworkWarning && (
          <div className="fixed bottom-4 right-4 bg-yellow-50 text-yellow-800 px-4 py-2 rounded-lg shadow-lg">
            网络连接不稳定，部分数据可能显示异常
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsiteDirectory;