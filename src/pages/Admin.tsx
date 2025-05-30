import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Upload, Trash2, Plus, X, Edit, Monitor, Tag, Link as LinkIcon, ImagePlus } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useAdvertisements } from '../contexts/AdvertisementContext';
import { uploadImage } from '../lib/upload';

interface Software {
  id: string;
  name: string;
  description: string;
  category_id: string;
  os_id: string;
  icon_url: string;
  screenshots: string[];
  direct_download_url?: string;
  cloud_download_url?: string;
  tags: Tag[];
  is_recommended: boolean;
  tutorial_url?: string;
}

interface Category {
  id: string;
  name: string;
}

interface OperatingSystem {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface Advertisement {
  id: string;
  image_url: string;
  link: string;
  title?: string;
  description?: string;
  created_at: string;
  display_order?: number;
}

// 广告预设数据
const SAMPLE_ADS: Advertisement[] = [
  {
    id: 'sample-1',
    image_url: 'https://via.placeholder.com/800x400?text=软件广告1',
    link: 'https://example.com/ad1',
    title: '软件推广',
    description: '发现最好的开发工具',
    created_at: new Date().toISOString(),
    display_order: 0
  },
  {
    id: 'sample-2',
    image_url: 'https://via.placeholder.com/800x400?text=特惠活动',
    link: 'https://example.com/ad2',
    title: '限时特惠',
    description: '折扣优惠进行中',
    created_at: new Date().toISOString(),
    display_order: 1
  },
  {
    id: 'sample-3',
    image_url: 'https://via.placeholder.com/800x400?text=新品发布',
    link: 'https://example.com/ad3',
    title: '新品上市',
    description: '全新产品发布会',
    created_at: new Date().toISOString(),
    display_order: 2
  }
];

// 在Admin组件的接口部分添加Website接口定义
interface Website {
  id: string;
  name: string;
  description: string;
  url: string;
  icon_url: string;
  category_id: string;
  category_name?: string;
  is_recommended: boolean;
  created_at: string;
  screenshots?: string[];
  tutorial_url?: string | null;
}

const Admin = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [software, setSoftware] = useState<Software[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [websiteCategories, setWebsiteCategories] = useState<Category[]>([]);
  const [operatingSystems, setOperatingSystems] = useState<OperatingSystem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editingSoftware, setEditingSoftware] = useState<Software | null>(null);
  const [newSoftware, setNewSoftware] = useState<Partial<Software>>({
    name: '',
    description: '',
    category_id: '',
    os_id: '',
    icon_url: '',
    screenshots: [],
    direct_download_url: '',
    cloud_download_url: '',
    tags: [],
  });
  const [iconUrlInput, setIconUrlInput] = useState('');
  const [screenshotUrlInput, setScreenshotUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [newOS, setNewOS] = useState('');
  const [editingOS, setEditingOS] = useState<OperatingSystem | null>(null);
  const [activeTab, setActiveTab] = useState<'software' | 'tags' | 'os' | 'ads' | 'websites' | 'categories'>('software');
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [newAd, setNewAd] = useState<Partial<Advertisement>>({
    image_url: '',
    link: '',
    title: '',
    description: '',
  });
  const [adImageUrlInput, setAdImageUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [draggedItem, setDraggedItem] = useState<Advertisement | null>(null);
  // 本地存储键
  const LOCAL_STORAGE_KEY = 'advertisement_order';
  
  // 为软件列表添加搜索和排序状态
  const [softwareSearchTerm, setSoftwareSearchTerm] = useState('');
  const [softwareSortOrder, setSoftwareSortOrder] = useState<'asc' | 'desc'>('asc');

  // 添加网站相关状态
  const [websites, setWebsites] = useState<Website[]>([]);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [newWebsite, setNewWebsite] = useState<Partial<Website>>({
    name: '',
    description: '',
    url: '',
    icon_url: '',
    category_id: '',
    is_recommended: false,
    screenshots: []
  });
  const [newCategory, setNewCategory] = useState({ name: '', slug: '' });
  const [editingCategory, setEditingCategory] = useState<{id: string; name: string; slug: string} | null>(null);
  const [newWebsiteCategory, setNewWebsiteCategory] = useState({ name: '', slug: '' });
  const [editingWebsiteCategory, setEditingWebsiteCategory] = useState<{id: string; name: string; slug: string} | null>(null);
  // 添加网站截图相关状态
  const [websiteScreenshotUrlInput, setWebsiteScreenshotUrlInput] = useState('');

  // 为网站列表添加搜索和排序状态
  const [websiteSearchTerm, setWebsiteSearchTerm] = useState('');
  const [websiteSortOrder, setWebsiteSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/');
      return;
    }

    loadSoftware();
    loadCategories();
    loadWebsiteCategories(); // 添加加载网站分类
    loadOperatingSystems();
    loadTags();
    loadAdvertisements();
    loadWebsites();
  }, [user, isAdmin]);

  const loadSoftware = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('software')
        .select('*, categories(*), operating_systems(*), tags(*)');

      if (error) {
        console.error('加载软件列表失败:', error);
        toast.error('加载软件列表失败');
        return;
      }

      // 处理每个软件的截图数据，确保是数组格式
      const processedData = data.map((item: any) => {
        // 确保screenshots是数组
        const screenshots = Array.isArray(item.screenshots) ? item.screenshots : [];
        
        return {
          ...item,
          screenshots: screenshots
        };
      });

      console.log(`加载了 ${processedData.length} 个软件项目`);
      setSoftware(processedData);
    } catch (error) {
      console.error('加载软件列表时发生错误:', error);
      toast.error('加载软件列表失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*');

    if (error) {
      console.error('Error loading categories:', error);
      return;
    }

    setCategories(data || []);
  };

  const loadOperatingSystems = async () => {
    const { data, error } = await supabase
      .from('operating_systems')
      .select('*');

    if (error) {
      console.error('Error loading operating systems:', error);
      return;
    }

    setOperatingSystems(data || []);
  };

  const loadTags = async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading tags:', error);
      return;
    }

    setTags(data || []);
  };

  const loadAdvertisements = async () => {
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data) {
        console.log('加载的广告数据:', data);
        setAdvertisements(data);
      }
    } catch (error) {
      console.error('Error loading advertisements:', error);
      toast.error('加载广告列表失败');
    }
  };

  const loadWebsites = async () => {
    try {
      const { data, error } = await supabase
        .from('websites')
        .select(`
          *,
          website_categories (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading websites:', error);
        toast.error('加载网站数据失败');
        return;
      }

      // 处理数据，确保category_name属性正确设置
      const processedData = (data || []).map(website => {
        return {
          ...website,
          // 如果website_categories存在，则使用其name作为category_name
          category_name: website.website_categories?.name || website.category_name || '未分类'
        };
      });

      console.log('处理后的网站数据:', processedData);
      setWebsites(processedData);
    } catch (error) {
      console.error('Error in loadWebsites:', error);
      toast.error('加载网站数据失败');
    }
  };

  const loadWebsiteCategories = async () => {
    const { data, error } = await supabase
      .from('website_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading website categories:', error);
      return;
    }

    setWebsiteCategories(data || []);
  };

  const handleIconUrlAdd = () => {
    if (!iconUrlInput.trim()) return;
    if (!iconUrlInput.match(/^https?:\/\/.+/)) {
      toast.error('请输入有效的URL地址');
      return;
    }

    setNewSoftware(prev => ({
      ...prev,
      icon_url: iconUrlInput.trim()
    }));
    setIconUrlInput('');
    toast.success('图标URL已添加');
  };

  const handleScreenshotUrlAdd = () => {
    if (!screenshotUrlInput.trim()) return;
    if (!screenshotUrlInput.match(/^https?:\/\/.+/)) {
      toast.error('请输入有效的URL地址');
      return;
    }

    setNewSoftware(prev => ({
      ...prev,
      screenshots: [...(prev.screenshots || []), screenshotUrlInput.trim()]
    }));
    setScreenshotUrlInput('');
    toast.success('截图URL已添加');
  };

  const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('图标文件大小不能超过5MB');
        return;
      }

      try {
        const path = `icons/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('software-images')
          .upload(path, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('software-images')
          .getPublicUrl(path);

        setNewSoftware(prev => ({
          ...prev,
          icon_url: publicUrl
        }));
        setIconUrlInput(publicUrl); // 添加这行，在输入框中显示上传的图片URL
      } catch (error) {
        console.error('Error uploading icon:', error);
        toast.error('图标上传失败');
      }
    }
  };

  const handleScreenshotsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploading(true);
    const files = Array.from(e.target.files);
    const uploadedUrls: string[] = [];
    const failedUploads: string[] = [];
    
    try {
      for (const file of files) {
        console.log(`开始上传截图: ${file.name}`);
        const { url, error } = await uploadImage(file, 'screenshots');
        
        if (error) {
          console.error('上传截图失败:', error);
          failedUploads.push(file.name);
          continue;
        }
        
        if (url) {
          console.log(`截图上传成功: ${url}`);
          uploadedUrls.push(url);
        }
      }
      
      if (uploadedUrls.length > 0) {
        console.log(`成功上传 ${uploadedUrls.length} 张截图，即将更新状态`);
        
        // 使用函数式更新确保状态更新基于最新状态
        if (editingSoftware) {
          setEditingSoftware((prev) => {
            if (!prev) return prev;
            const updatedScreenshots = [...(prev.screenshots || []), ...uploadedUrls];
            console.log('更新后的截图数组:', updatedScreenshots);
            return {
              ...prev,
              screenshots: updatedScreenshots
            };
          });
          
          // 同时更新newSoftware状态以确保提交时使用正确的数据
          setNewSoftware((prev) => ({
            ...prev,
            screenshots: [...(prev.screenshots || []), ...uploadedUrls]
          }));
        } else {
          setNewSoftware((prev) => {
            const updatedScreenshots = [...(prev.screenshots || []), ...uploadedUrls];
            console.log('更新后的截图数组:', updatedScreenshots);
            return {
              ...prev,
              screenshots: updatedScreenshots
            };
          });
        }
        
        toast.success(`成功上传 ${uploadedUrls.length} 张截图`);
        
        if (failedUploads.length > 0) {
          toast.error(`${failedUploads.length} 张截图上传失败`);
        }
      } else if (failedUploads.length > 0) {
        toast.error('所有截图上传失败');
      }
    } catch (error) {
      console.error('上传截图过程中发生错误:', error);
      toast.error('上传截图失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsUploading(false);
      // 清空文件输入
      e.target.value = '';
    }
  };

  const removeScreenshot = (index: number) => {
    setNewSoftware(prev => ({
      ...prev,
      screenshots: prev.screenshots?.filter((_, i) => i !== index) || []
    }));
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) {
      toast.error('标签名称不能为空');
      return;
    }

    try {
      const slug = newTag.trim().toLowerCase().replace(/\s+/g, '-');
      
      // Check if tag with same name or slug exists
      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .or(`name.eq.${newTag.trim()},slug.eq.${slug}`)
        .single();

      if (existingTag) {
        toast.error('该标签已存在');
        return;
      }

      const { data, error } = await supabase
        .from('tags')
        .insert({ 
          name: newTag.trim(), 
          slug: slug
        })
        .select()
        .single();

      if (error) throw error;

      setTags(prev => [...prev, data]);
      setNewTag('');
      toast.success('标签添加成功');
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error('添加标签失败');
    }
  };

  const handleEditTag = async (tag: Tag) => {
    if (!editingTag) return;
    if (!editingTag.name.trim()) {
      toast.error('标签名称不能为空');
      return;
    }

    try {
      const newSlug = editingTag.name.trim().toLowerCase().replace(/\s+/g, '-');
      
      // Check if another tag with same name or slug exists
      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .or(`name.eq.${editingTag.name.trim()},slug.eq.${newSlug}`)
        .neq('id', tag.id)
        .single();

      if (existingTag) {
        toast.error('该标签名称已存在');
        return;
      }

      const { error } = await supabase
        .from('tags')
        .update({ 
          name: editingTag.name.trim(),
          slug: newSlug
        })
        .eq('id', tag.id);

      if (error) throw error;

      setTags(prev => 
        prev.map(item => item.id === tag.id ? {
          ...item,
          name: editingTag.name.trim(),
          slug: newSlug
        } : item)
      );
      setEditingTag(null);
      toast.success('标签更新成功');
    } catch (error) {
      console.error('Error updating tag:', error);
      toast.error('更新标签失败');
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    if (!window.confirm(`确定要删除标签 "${tag.name}" 吗？`)) return;

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tag.id);

      if (error) throw error;

      setTags(prev => prev.filter(item => item.id !== tag.id));
      setSelectedTags(prev => prev.filter(id => id !== tag.id));
      toast.success('标签删除成功');
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('删除标签失败');
    }
  };

  const handleAddOS = async () => {
    if (!newOS.trim()) return;

    try {
      const { data, error } = await supabase
        .from('operating_systems')
        .insert({ 
          name: newOS.trim(), 
          slug: newOS.trim().toLowerCase().replace(/\s+/g, '-') 
        })
        .select()
        .single();

      if (error) throw error;

      setOperatingSystems(prev => [...prev, data]);
      setNewOS('');
      toast.success('操作系统添加成功');
    } catch (error) {
      console.error('Error adding OS:', error);
      toast.error('添加操作系统失败');
    }
  };

  const handleEditOS = async (os: OperatingSystem) => {
    if (!editingOS) return;

    try {
      const { error } = await supabase
        .from('operating_systems')
        .update({ 
          name: editingOS.name,
          slug: editingOS.name.toLowerCase().replace(/\s+/g, '-')
        })
        .eq('id', os.id);

      if (error) throw error;

      setOperatingSystems(prev => 
        prev.map(item => item.id === os.id ? editingOS : item)
      );
      setEditingOS(null);
      toast.success('操作系统更新成功');
    } catch (error) {
      console.error('Error updating OS:', error);
      toast.error('更新操作系统失败');
    }
  };

  const handleDeleteOS = async (os: OperatingSystem) => {
    if (!window.confirm(`确定要删除操作系统 "${os.name}" 吗？`)) return;

    try {
      const { error } = await supabase
        .from('operating_systems')
        .delete()
        .eq('id', os.id);

      if (error) throw error;

      setOperatingSystems(prev => prev.filter(item => item.id !== os.id));
      toast.success('操作系统删除成功');
    } catch (error) {
      console.error('Error deleting OS:', error);
      toast.error('删除操作系统失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSoftware.name || !newSoftware.description || !newSoftware.category_id || !newSoftware.os_id) {
      toast.error('请填写必要信息');
      return;
    }

    if (!newSoftware.icon_url) {
      toast.error('请上传软件图标');
      return;
    }

    if (!newSoftware.direct_download_url && !newSoftware.cloud_download_url) {
      toast.error('请至少提供一个下载链接');
      return;
    }

    setIsUploading(true);

    try {
      // 确保截图数组数据正确
      let screenshots = newSoftware.screenshots || [];
      
      // 打印截图数据进行检查
      console.log('提交前的截图数据:', screenshots);
      
      // 确保screenshots是一个数组而不是null或undefined
      if (!Array.isArray(screenshots)) {
        screenshots = [];
        console.warn('截图数据不是数组，已重置为空数组');
      }
      
      // 过滤掉无效的URL
      screenshots = screenshots.filter(url => url && typeof url === 'string' && url.trim() !== '');
      
      const softwareData = {
        ...newSoftware,
        screenshots: screenshots
      };
      
      console.log('即将保存的软件数据:', softwareData);

      if (editingSoftware) {
        // 确保使用正确的ID
        const softwareId = editingSoftware.id;
        console.log(`更新软件ID: ${softwareId}`);
        
        const { error: updateError } = await supabase
          .from('software')
          .update(softwareData)
          .eq('id', softwareId);

        if (updateError) {
          console.error('更新软件信息失败:', updateError);
          throw updateError;
        }

        // 验证更新是否成功
        const { data: verifyData, error: verifyError } = await supabase
          .from('software')
          .select('screenshots')
          .eq('id', softwareId)
          .single();
          
        if (verifyError) {
          console.warn('验证更新结果失败:', verifyError);
        } else {
          console.log('更新后的截图数据:', verifyData.screenshots);
        }

        await supabase
          .from('software_tags')
          .delete()
          .eq('software_id', softwareId);

        if (selectedTags.length > 0) {
          await supabase
            .from('software_tags')
            .insert(
              selectedTags.map(tagId => ({
                software_id: softwareId,
                tag_id: tagId
              }))
            );
        }

        toast.success('软件更新成功');
      } else {
        const { data: newSoftwareData, error: insertError } = await supabase
          .from('software')
          .insert(softwareData)
          .select()
          .single();

        if (insertError) {
          console.error('插入软件信息失败:', insertError);
          throw insertError;
        }
        
        console.log('新建软件成功，返回数据:', newSoftwareData);

        if (selectedTags.length > 0) {
          await supabase
            .from('software_tags')
            .insert(
              selectedTags.map(tagId => ({
                software_id: newSoftwareData.id,
                tag_id: tagId
              }))
            );
        }

        toast.success('软件添加成功');
      }

      setNewSoftware({
        name: '',
        description: '',
        category_id: '',
        os_id: '',
        icon_url: '',
        screenshots: [],
        direct_download_url: '',
        cloud_download_url: '',
        tags: [],
        tutorial_url: '', // Added tutorial_url
      });
      setSelectedTags([]);
      setEditingSoftware(null);
      setIconUrlInput(''); // Clear icon URL input
      setScreenshotUrlInput(''); // Clear screenshot URL input
      loadSoftware();
    } catch (error) {
      console.error('保存软件信息时发生错误:', error);
      toast.error('保存失败，请稍后重试: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (software: Software) => {
    // 确保screenshots是数组
    const screenshots = Array.isArray(software.screenshots) ? software.screenshots : [];
    
    console.log('编辑软件:', software.name);
    console.log('原始截图数据:', software.screenshots);
    console.log('处理后的截图数据:', screenshots);
    
    setEditingSoftware({
      ...software,
      screenshots: screenshots
    });
    
    setNewSoftware({
      name: software.name,
      description: software.description,
      category_id: software.category_id,
      os_id: software.os_id,
      icon_url: software.icon_url,
      screenshots: screenshots,
      direct_download_url: software.direct_download_url,
      cloud_download_url: software.cloud_download_url,
      tags: software.tags,
      tutorial_url: software.tutorial_url, // Added tutorial_url
    });
    
    setSelectedTags(software.tags.map(tag => tag.id));
    window.scrollTo(0, 0); // Scroll to top
  };

  const toggleRecommendation = async (softwareId: string, isRecommended: boolean) => {
    try {
      const { error } = await supabase
        .from('software')
        .update({ is_recommended: isRecommended })
        .eq('id', softwareId);
  
      if (error) throw error;
  
      setSoftware(prev =>
        prev.map(item =>
          item.id === softwareId ? { ...item, is_recommended: isRecommended } : item
        )
      );
      toast.success(isRecommended ? '已设置为推荐' : '已取消推荐');
    } catch (error) {
      console.error('Error toggling recommendation:', error);
      toast.error('操作失败');
    }
    
    // setSelectedTags(website.tags.map(tag => tag.id)); // Websites don't have tags in the same way
    window.scrollTo(0, 0); // Scroll to top
  };
  
  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个软件吗？')) return;

    try {
      const { error } = await supabase
        .from('software')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('删除成功');
      loadSoftware();
    } catch (error) {
      console.error('Error deleting software:', error);
      toast.error('删除失败，请稍后重试');
    }
  };

  const navigateToAds = () => {
    navigate('/admin/ads');
  };

  const renderNavigation = () => {
    return (
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-4 -mb-px">
          <button
            onClick={() => setActiveTab('software')}
            className={clsx(
              "px-1 py-4 font-medium text-sm border-b-2 focus:outline-none",
              activeTab === 'software'
                ? "border-blue-500 text-blue-500"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            软件管理
          </button>
          <button
            onClick={() => setActiveTab('websites')}
            className={clsx(
              "px-1 py-4 font-medium text-sm border-b-2 focus:outline-none",
              activeTab === 'websites'
                ? "border-blue-500 text-blue-500"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            网站管理
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={clsx(
              "px-1 py-4 font-medium text-sm border-b-2 focus:outline-none",
              activeTab === 'tags'
                ? "border-blue-500 text-blue-500"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            标签管理
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={clsx(
              "px-1 py-4 font-medium text-sm border-b-2 focus:outline-none",
              activeTab === 'categories'
                ? "border-blue-500 text-blue-500"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            分类管理
          </button>
          <button
            onClick={() => setActiveTab('os')}
            className={clsx(
              "px-1 py-4 font-medium text-sm border-b-2 focus:outline-none",
              activeTab === 'os'
                ? "border-blue-500 text-blue-500"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            系统管理
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={clsx(
              "px-1 py-4 font-medium text-sm border-b-2 focus:outline-none",
              activeTab === 'ads'
                ? "border-blue-500 text-blue-500"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            广告管理
          </button>
        </nav>
      </div>
    );
  };

  const handleAdImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploading(true);
    try {
      const file = e.target.files[0];
      
      // 使用新的uploadImage函数
      const { url, error } = await uploadImage(file, 'ads');
      if (error) {
        toast.error(`上传广告图片失败: ${error.message}`);
        return;
      }
      
      if (url) {
        if (editingAd) {
          setEditingAd({ ...editingAd, image_url: url });
        } else {
          setNewAd({ ...newAd, image_url: url });
        }
        toast.success('图片上传成功');
      }
    } catch (error) {
      console.error('图片上传失败:', error);
      toast.error('图片上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddAd = async () => {
    if (!newAd.image_url || !newAd.link) {
      toast.error('请提供广告图片和链接');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('advertisements')
        .insert([{
          image_url: newAd.image_url,
          link: newAd.link,
          title: newAd.title,
          description: newAd.description,
          display_order: advertisements.length
        }])
        .select();

      if (error) throw error;

      setAdvertisements(prev => [data[0], ...prev]);
      setNewAd({
        image_url: '',
        link: '',
        title: '',
        description: '',
      });
      setAdImageUrlInput('');
      toast.success('广告添加成功');
    } catch (error) {
      console.error('Error adding advertisement:', error);
      toast.error('广告添加失败');
    }
  };

  const handleUpdateAd = async () => {
    if (!editingAd) return;
    
    setIsUploading(true);
    
    try {
      // 现在数据库已有title和description字段，可以正常更新所有字段
      const { error } = await supabase
        .from('advertisements')
        .update({
          link: editingAd.link,
          title: editingAd.title || '精品软件推荐',
          description: editingAd.description || '专业软件工具集'
        })
        .eq('id', editingAd.id);
      
      if (error) {
        console.error('更新广告失败:', error);
        throw new Error('更新广告失败');
      }
      
      // 更新本地状态
      setAdvertisements(prev => prev.map(ad => 
        ad.id === editingAd.id ? editingAd : ad
      ));
      
      setEditingAd(null);
      toast.success('广告更新成功');
    } catch (error) {
      toast.error('更新广告失败');
      console.error('更新广告失败:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!window.confirm('确定要删除这个广告吗？')) return;

    try {
      const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAdvertisements(prev => prev.filter(ad => ad.id !== id));
      toast.success('广告删除成功');
    } catch (error) {
      console.error('Error deleting advertisement:', error);
      toast.error('广告删除失败');
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, ad: Advertisement) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ id: ad.id }));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetAd: Advertisement) => {
    e.preventDefault();
    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      
      const { id: draggedId } = JSON.parse(data);
      if (draggedId === targetAd.id) return;

      // 找到被拖拽的广告和目标位置
      const draggedIndex = advertisements.findIndex(ad => ad.id === draggedId);
      const targetIndex = advertisements.findIndex(ad => ad.id === targetAd.id);
      
      if (draggedIndex === -1 || targetIndex === -1) return;
      
      // 创建新的广告数组
      const newAds = [...advertisements];
      const [draggedAd] = newAds.splice(draggedIndex, 1);
      newAds.splice(targetIndex, 0, draggedAd);
      
      // 更新显示顺序
      const updatedAds = newAds.map((ad, index) => ({
        ...ad,
        display_order: index
      }));
      
      // 先更新本地状态，让用户看到变化
      setAdvertisements(updatedAds);
      
      // 逐个更新数据库中的顺序
      for (const ad of updatedAds) {
        const { error } = await supabase
          .from('advertisements')
          .update({ display_order: ad.display_order })
          .eq('id', ad.id);
          
        if (error) {
          console.error(`更新广告 ${ad.id} 顺序失败:`, error);
          throw error;
        }
      }
      
      toast.success('广告顺序已更新');
    } catch (error) {
      console.error('更新顺序失败:', error);
      toast.error('更新顺序失败');
      
      // 出错时重新加载，恢复正确状态
      loadAdvertisements();
    }
  };

  const handleDragEnd = async () => {
    if (!draggedItem) return;
    setDraggedItem(null);
    
    // 保存新的排序到本地存储
    try {
      const orderMap: {[key: string]: number} = {};
      ads.forEach((ad: AdItem, index: number) => {
        orderMap[ad.id] = index;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(orderMap));
      console.log('广告顺序已保存到本地');
      
      // 尝试保存到数据库（如果可能）
      await saveDisplayOrder();
    } catch (error) {
      console.error('保存广告顺序到本地失败:', error);
      toast.error('保存广告顺序失败');
    }
  };

  // 保存广告显示顺序到数据库
  const saveDisplayOrder = async () => {
    try {
      setIsUploading(true);
      
      // 收集需要更新的数据
      const updates = ads.map((ad: Advertisement, index: number) => ({
        id: ad.id,
        // 我们不再使用display_order字段更新
        // 我们可以记录新顺序，但暂时不发送到服务器
        index: index
      }));
      
      // 尝试检查是否可以更新display_order字段
      // 先只更新第一个广告，测试是否支持
      if (updates.length > 0) {
        const testUpdate = {
          display_order: 0
        };
        
        const { error } = await supabase
          .from('advertisements')
          .update(testUpdate)
          .eq('id', updates[0].id);
        
        if (error) {
          if (error.code === '42703') {
            // 数据库中没有display_order列
            console.error('数据库中缺少display_order列:', error);
            toast.error('数据库中缺少display_order列，顺序已在本地保存，但不会同步到服务器');
            
            // 虽然无法保存到数据库，但我们仍然可以在本地保持排序
            return;
          } else {
            throw error;
          }
        }
        
        // 如果测试成功，则继续更新其他广告
        for (let i = 1; i < updates.length; i++) {
          const { error } = await supabase
            .from('advertisements')
            .update({ display_order: updates[i].index })
            .eq('id', updates[i].id);
          
          if (error) {
            console.error('更新广告顺序失败:', error);
            throw error;
          }
        }
        
        toast.success('广告顺序已保存');
      }
    } catch (error) {
      console.error('保存广告顺序失败:', error);
      toast.error('保存广告顺序失败，但排序在本地仍然有效');
    } finally {
      setIsUploading(false);
    }
  };

  // 添加网站表单处理函数
  const handleWebsiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newWebsite.name || !newWebsite.url || !newWebsite.category_id) {
      toast.error('请填写必填字段');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('准备添加新网站，数据:', newWebsite);
      
      // 处理并验证截图数据
      const screenshots = Array.isArray(newWebsite.screenshots) ? newWebsite.screenshots : [];
      
      // 获取分类名称
      const category = websiteCategories.find(cat => cat.id === newWebsite.category_id);
      
      const { data, error } = await supabase
        .from('websites')
        .insert({
          name: newWebsite.name,
          description: newWebsite.description || '',
          url: newWebsite.url,
          icon_url: newWebsite.icon_url || '',
          category_id: newWebsite.category_id,
          category_name: category?.name || '未分类',
          is_recommended: newWebsite.is_recommended || false,
          screenshots: screenshots,
          tutorial_url: newWebsite.tutorial_url || null, // Added tutorial_url
        })
        .select();
      
      if (error) {
        console.error('添加网站时发生错误:', error);
        throw error;
      }
      
      console.log('网站添加成功，返回数据:', data);
      toast.success('网站添加成功');
      
      setNewWebsite({
        name: '',
        description: '',
        url: '',
        icon_url: '',
        category_id: '',
        is_recommended: false,
        screenshots: [],
        tutorial_url: '', // Ensure tutorial_url is reset
      });
      setWebsiteScreenshotUrlInput(''); // Clear website screenshot URL input
      
      loadWebsites();
    } catch (error) {
      console.error('添加网站失败:', error);
      toast.error('添加网站失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };
  
  // 添加编辑网站的函数
  const handleEditWebsite = (website: Website) => {
    console.log('编辑网站:', website);
    
    // 确保screenshots是数组
    const screenshots = Array.isArray(website.screenshots) ? website.screenshots : [];
    
    setEditingWebsite({
      ...website,
      screenshots
    });
    
    setNewWebsite({
      name: website.name,
      description: website.description,
      url: website.url,
      icon_url: website.icon_url,
      category_id: website.category_id,
      is_recommended: website.is_recommended,
      screenshots,
      tutorial_url: website.tutorial_url, // Added tutorial_url
    });
    window.scrollTo(0, 0); // Scroll to top - ADDED THIS LINE
  };
  
  const handleUpdateWebsite = async () => {
    if (!editingWebsite) return;
    
    if (!editingWebsite.name || !editingWebsite.url || !editingWebsite.category_id) {
      toast.error('请填写必填字段');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('准备更新网站，数据:', editingWebsite);
      
      // 处理并验证截图数据
      const screenshots = Array.isArray(editingWebsite.screenshots) ? editingWebsite.screenshots : [];
      
      // 获取分类名称
      const category = websiteCategories.find(cat => cat.id === editingWebsite.category_id);
      
      const { error } = await supabase
        .from('websites')
        .update({
          name: editingWebsite.name,
          description: editingWebsite.description,
          url: editingWebsite.url,
          icon_url: editingWebsite.icon_url,
          category_id: editingWebsite.category_id,
          category_name: category?.name || '未分类',
          is_recommended: editingWebsite.is_recommended,
          screenshots: screenshots,
          tutorial_url: editingWebsite.tutorial_url || null, // Added tutorial_url
        })
        .eq('id', editingWebsite.id);
      
      if (error) {
        console.error('更新网站时发生错误:', error);
        throw error;
      }
      
      toast.success('网站更新成功');
      setEditingWebsite(null);
      // Reset newWebsite to clear the form for subsequent additions
      setNewWebsite({
        name: '',
        description: '',
        url: '',
        icon_url: '',
        category_id: '',
        is_recommended: false,
        screenshots: [],
        tutorial_url: '', 
      });
      setWebsiteScreenshotUrlInput(''); // Clear website screenshot URL input
      loadWebsites();
    } catch (error) {
      console.error('更新网站失败:', error);
      toast.error('更新网站失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };
  
  // 添加删除网站的函数
  const handleDeleteWebsite = async (id: string) => {
    if (!confirm('确定要删除这个网站吗？此操作无法撤销。')) return;
    
    try {
      const { error } = await supabase
        .from('websites')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success('网站删除成功');
      loadWebsites();
    } catch (error) {
      console.error('Error deleting website:', error);
      toast.error('删除网站失败');
    }
  };

  // 刷新广告列表
  const refreshAds = () => {
    toast.promise(
      loadAdvertisements(),
      {
        loading: '正在刷新广告列表...',
        success: '广告列表已刷新',
        error: '刷新广告列表失败'
      }
    );
  };

  // 添加网站分类
  const handleAddWebsiteCategory = async () => {
    if (!newWebsiteCategory.name) {
      toast.error('分类名称不能为空');
      return;
    }

    try {
      const slug = newWebsiteCategory.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const { data, error } = await supabase
        .from('website_categories')
        .insert([{
          name: newWebsiteCategory.name,
          slug: slug
        }])
        .select();

      if (error) throw error;

      toast.success('分类添加成功');
      setNewWebsiteCategory({ name: '', slug: '' });
      loadWebsiteCategories();
    } catch (error) {
      console.error('Error adding website category:', error);
      toast.error('添加分类失败');
    }
  };

  // 更新网站分类
  const handleUpdateWebsiteCategory = async () => {
    if (!editingWebsiteCategory) return;

    try {
      const slug = editingWebsiteCategory.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const { error } = await supabase
        .from('website_categories')
        .update({
          name: editingWebsiteCategory.name,
          slug: slug
        })
        .eq('id', editingWebsiteCategory.id);

      if (error) throw error;

      toast.success('分类更新成功');
      setEditingWebsiteCategory(null);
      loadWebsiteCategories();
    } catch (error) {
      console.error('Error updating website category:', error);
      toast.error('更新分类失败');
    }
  };

  // 删除网站分类
  const handleDeleteWebsiteCategory = async (id: string) => {
    if (!confirm('确定要删除这个分类吗？此操作可能会影响已分类的网站。')) return;

    try {
      const { error } = await supabase
        .from('website_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('分类删除成功');
      loadWebsiteCategories();
    } catch (error) {
      console.error('Error deleting website category:', error);
      toast.error('删除分类失败');
    }
  };

  // 添加软件分类
  const handleAddCategory = async () => {
    if (!newCategory.name) {
      toast.error('分类名称不能为空');
      return;
    }

    try {
      const slug = newCategory.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: newCategory.name,
          slug: slug
        }])
        .select();

      if (error) throw error;

      toast.success('分类添加成功');
      setNewCategory({ name: '', slug: '' });
      loadCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('添加分类失败');
    }
  };

  // 更新软件分类
  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    try {
      const slug = editingCategory.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const { error } = await supabase
        .from('categories')
        .update({
          name: editingCategory.name,
          slug: slug
        })
        .eq('id', editingCategory.id);

      if (error) throw error;

      toast.success('分类更新成功');
      setEditingCategory(null);
      loadCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('更新分类失败');
    }
  };

  // 删除软件分类
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('确定要删除这个分类吗？此操作可能会影响已分类的软件。')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('分类删除成功');
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('删除分类失败');
    }
  };

  // 添加网站推荐和取消推荐的函数
  const toggleWebsiteRecommendation = async (websiteId: string, isRecommended: boolean) => {
    try {
      const { error } = await supabase
        .from('websites')
        .update({ is_recommended: isRecommended })
        .eq('id', websiteId);

      if (error) throw error;

      // 更新本地状态
      setWebsites(prev =>
        prev.map(website =>
          website.id === websiteId ? { ...website, is_recommended: isRecommended } : website
        )
      );

      toast.success(isRecommended ? '已设为推荐' : '已取消推荐');
    } catch (error) {
      console.error('Error toggling website recommendation:', error);
      toast.error('操作失败，请稍后重试');
    }
    
    // setSelectedTags(website.tags.map(tag => tag.id)); // Websites don't have tags in the same way
    window.scrollTo(0, 0); // Scroll to top
  };

  // 修改处理网站截图 URL 输入的方法
  const handleWebsiteScreenshotUrlAdd = () => {
    if (!websiteScreenshotUrlInput || !websiteScreenshotUrlInput.trim()) {
      toast.error('请输入有效的截图 URL');
      return;
    }

    if (editingWebsite) {
      const screenshots = editingWebsite.screenshots || [];
      setEditingWebsite({
        ...editingWebsite,
        screenshots: [...screenshots, websiteScreenshotUrlInput.trim()]
      });
    } else {
      const screenshots = newWebsite.screenshots || [];
      setNewWebsite({
        ...newWebsite,
        screenshots: [...screenshots, websiteScreenshotUrlInput.trim()]
      });
    }
    setWebsiteScreenshotUrlInput('');
  };

  // 添加网站截图上传方法
  const handleWebsiteScreenshotsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploading(true);
    const files = Array.from(e.target.files);
    const uploadedUrls: string[] = [];
    const failedUploads: string[] = [];
    
    try {
      for (const file of files) {
        console.log(`开始上传网站截图: ${file.name}`);
        const { url, error } = await uploadImage(file, 'website-screenshots');
        
        if (error) {
          console.error('上传网站截图失败:', error);
          failedUploads.push(file.name);
          continue;
        }
        
        if (url) {
          console.log(`网站截图上传成功: ${url}`);
          uploadedUrls.push(url);
        }
      }
      
      if (uploadedUrls.length > 0) {
        console.log(`成功上传 ${uploadedUrls.length} 张网站截图，即将更新状态`);
        
        // 使用函数式更新确保状态更新基于最新状态
        if (editingWebsite) {
          setEditingWebsite((prev) => {
            if (!prev) return prev;
            const updatedScreenshots = [...(prev.screenshots || []), ...uploadedUrls];
            console.log('更新后的网站截图数组:', updatedScreenshots);
            return {
              ...prev,
              screenshots: updatedScreenshots
            };
          });
        } else {
          setNewWebsite((prev) => {
            const updatedScreenshots = [...(prev.screenshots || []), ...uploadedUrls];
            console.log('更新后的网站截图数组:', updatedScreenshots);
            return {
              ...prev,
              screenshots: updatedScreenshots
            };
          });
        }
        
        toast.success(`成功上传 ${uploadedUrls.length} 张网站截图`);
        
        if (failedUploads.length > 0) {
          toast.error(`${failedUploads.length} 张网站截图上传失败`);
        }
      } else if (failedUploads.length > 0) {
        toast.error('所有网站截图上传失败');
      }
    } catch (error) {
      console.error('上传网站截图过程中发生错误:', error);
      toast.error('上传网站截图失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsUploading(false);
      // 清空文件输入
      e.target.value = '';
    }
  };

  // 删除网站截图的方法
  const removeWebsiteScreenshot = (index: number) => {
    if (editingWebsite && editingWebsite.screenshots) {
      const newScreenshots = [...editingWebsite.screenshots];
      newScreenshots.splice(index, 1);
      setEditingWebsite({ ...editingWebsite, screenshots: newScreenshots });
    } else if (newWebsite.screenshots) {
      const newScreenshots = [...newWebsite.screenshots];
      newScreenshots.splice(index, 1);
      setNewWebsite({ ...newWebsite, screenshots: newScreenshots });
    }
  };

  // 网站图标上传处理函数
  const handleWebsiteIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('图标文件大小不能超过5MB');
        return;
      }

      try {
        console.log('开始上传网站图标:', file.name);
        const { url, error } = await uploadImage(file, 'website-icons');

        if (error) {
          console.error('网站图标上传失败:', error);
          toast.error(`图标上传失败: ${error.message}`);
          return;
        }

        if (url) {
          console.log('网站图标上传成功:', url);
          if (editingWebsite) {
            setEditingWebsite({
              ...editingWebsite,
              icon_url: url
            });
          } else {
            setNewWebsite({
              ...newWebsite,
              icon_url: url
            });
          }
          toast.success('图标上传成功');
        }
      } catch (error) {
        console.error('网站图标上传过程中发生错误:', error);
        toast.error('图标上传失败: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
  };

  // 修改网站管理表单，添加截图上传部分（在网站表单的适当位置）
  const renderWebsiteForm = () => {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-lg font-semibold mb-4">
          {editingWebsite ? '编辑网站' : '添加新网站'}
        </h2>
        <form onSubmit={handleWebsiteSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              网站名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editingWebsite ? editingWebsite.name : newWebsite.name}
              onChange={(e) => 
                editingWebsite 
                  ? setEditingWebsite({...editingWebsite, name: e.target.value})
                  : setNewWebsite({...newWebsite, name: e.target.value})
              }
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              网站URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={editingWebsite ? editingWebsite.url : newWebsite.url}
              onChange={(e) => 
                editingWebsite 
                  ? setEditingWebsite({...editingWebsite, url: e.target.value})
                  : setNewWebsite({...newWebsite, url: e.target.value})
              }
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              描述
            </label>
            <textarea
              value={editingWebsite ? editingWebsite.description : newWebsite.description}
              onChange={(e) => 
                editingWebsite 
                  ? setEditingWebsite({...editingWebsite, description: e.target.value})
                  : setNewWebsite({...newWebsite, description: e.target.value})
              }
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              分类 <span className="text-red-500">*</span>
            </label>
            <select
              value={editingWebsite ? editingWebsite.category_id : newWebsite.category_id}
              onChange={(e) => 
                editingWebsite 
                  ? setEditingWebsite({...editingWebsite, category_id: e.target.value})
                  : setNewWebsite({...newWebsite, category_id: e.target.value})
              }
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">-- 选择分类 --</option>
              {websiteCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              图标URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={editingWebsite ? editingWebsite.icon_url : newWebsite.icon_url}
                onChange={(e) => 
                  editingWebsite 
                    ? setEditingWebsite({...editingWebsite, icon_url: e.target.value})
                    : setNewWebsite({...newWebsite, icon_url: e.target.value})
                }
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入图标URL"
              />
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleWebsiteIconChange}
                  className="hidden"
                  id="website-icon-upload"
                />
                <label
                  htmlFor="website-icon-upload"
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload size={16} />
                  上传
                </label>
              </div>
              <button
                type="button"
                onClick={() => 
                  editingWebsite 
                    ? setEditingWebsite({...editingWebsite, icon_url: editingWebsite.icon_url})
                    : handleIconUrlAdd()
                }
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                添加
              </button>
            </div>
            {(editingWebsite?.icon_url || newWebsite.icon_url) && (
              <div className="mt-2">
                <img
                  src={editingWebsite ? editingWebsite.icon_url : newWebsite.icon_url}
                  alt="图标预览"
                  className="w-20 h-20 object-cover rounded"
                  onError={(e) => {
                    e.currentTarget.src = "https://via.placeholder.com/100?text=无法加载";
                  }}
                />
              </div>
            )}
          </div>

          {/* 网站截图上传部分 */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              网站截图
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={websiteScreenshotUrlInput}
                onChange={(e) => setWebsiteScreenshotUrlInput(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入截图URL"
              />
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleWebsiteScreenshotsChange}
                  className="hidden"
                  id="website-screenshots-upload"
                  multiple
                />
                <label
                  htmlFor="website-screenshots-upload"
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload size={16} />
                  上传
                </label>
              </div>
              <button
                type="button"
                onClick={handleWebsiteScreenshotUrlAdd}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                添加
              </button>
            </div>
            
            <div className="mt-2 flex flex-wrap gap-2">
              {(editingWebsite ? editingWebsite.screenshots : newWebsite.screenshots)?.map((screenshot, index) => (
                <div key={index} className="relative">
                  <img
                    src={screenshot}
                    alt={`截图 ${index + 1}`}
                    className="w-20 h-20 object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/100?text=加载失败";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeWebsiteScreenshot(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Added Tutorial URL input field for Websites */}
          <div className="mb-4">
            <label className="block text-green-600 font-medium mb-2">
              使用教程链接 (选填)
            </label>
            <input
              type="url"
              value={editingWebsite ? editingWebsite.tutorial_url || '' : newWebsite.tutorial_url || ''}
              onChange={(e) => 
                editingWebsite 
                  ? setEditingWebsite({...editingWebsite, tutorial_url: e.target.value})
                  : setNewWebsite({...newWebsite, tutorial_url: e.target.value})
              }
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入教程页面的完整URL"
            />
          </div>

          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="isRecommended" // Make sure this ID is unique if form is part of a list or similar
              checked={editingWebsite ? !!editingWebsite.is_recommended : !!newWebsite.is_recommended}
              onChange={(e) => 
                editingWebsite 
                  ? setEditingWebsite({...editingWebsite, is_recommended: e.target.checked})
                  : setNewWebsite({...newWebsite, is_recommended: e.target.checked})
              }
              className="mr-2"
            />
            <label htmlFor="isRecommended" className="text-sm font-medium text-gray-700">
              推荐网站
            </label>
          </div>

          <div className="flex justify-end gap-2">
            {editingWebsite ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingWebsite(null); 
                    setNewWebsite({
                      name: '',
                      description: '',
                      url: '',
                      icon_url: '',
                      category_id: '',
                      is_recommended: false,
                      screenshots: [],
                      tutorial_url: '' // Reset tutorial_url as well
                    });
                    setWebsiteScreenshotUrlInput(''); // Clear website screenshot URL input
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleUpdateWebsite}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  更新网站
                </button>
              </>
            ) : (
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? '添加中...' : '添加网站'}
              </button>
            )}
          </div>
        </form>
      </div>
    );
  };

  // 在网站管理部分中使用新的渲染函数
  const renderWebsiteTab = () => {
    // 筛选和排序网站列表
    const filteredAndSortedWebsites = websites
      .filter(website =>
        website.name.toLowerCase().includes(websiteSearchTerm.toLowerCase()) ||
        (website.description && website.description.toLowerCase().includes(websiteSearchTerm.toLowerCase())) ||
        website.url.toLowerCase().includes(websiteSearchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA < nameB) {
          return websiteSortOrder === 'asc' ? -1 : 1;
        }
        if (nameA > nameB) {
          return websiteSortOrder === 'asc' ? 1 : -1;
        }
        return 0;
      });

    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {editingWebsite ? '编辑网站' : '添加新网站'}
        </h2>
        
        {renderWebsiteForm()}
        
        <h2 className="text-xl font-semibold mb-4">网站列表</h2>
        
        {/* 搜索和排序控件 */}
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="搜索网站名称、描述或URL..."
            className="flex-grow p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={websiteSearchTerm}
            onChange={e => setWebsiteSearchTerm(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setWebsiteSortOrder('asc')}
              className={`px-4 py-2 rounded ${websiteSortOrder === 'asc' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              A-Z
            </button>
            <button
              onClick={() => setWebsiteSortOrder('desc')}
              className={`px-4 py-2 rounded ${websiteSortOrder === 'desc' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Z-A
            </button>
          </div>
        </div>

        {filteredAndSortedWebsites.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-xl text-center">
            <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">未找到匹配的网站或暂无数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    网站
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    分类
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    推荐
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    截图数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAndSortedWebsites.map((website) => (
                  <tr key={website.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {website.icon_url ? (
                            <img 
                              className="h-10 w-10 rounded-full" 
                              src={website.icon_url} 
                              alt={website.name}
                              onError={(e) => {
                                e.currentTarget.src = "https://via.placeholder.com/40?text=Error";
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <Monitor className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{website.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {website.description?.substring(0, 50) || '无描述'}
                            {website.description?.length > 50 ? '...' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{website.category_name || '未分类'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-blue-500">
                        <LinkIcon className="w-4 h-4 mr-1" />
                        <a 
                          href={website.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="hover:underline truncate max-w-[150px]"
                          title={website.url}
                        >
                          {website.url}
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => toggleWebsiteRecommendation(website.id, !website.is_recommended)}
                        className={clsx(
                          "px-3 py-1 rounded-md text-sm",
                          website.is_recommended
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        )}
                      >
                        {website.is_recommended ? "已推荐" : "推荐"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{website.screenshots?.length || 0} 张</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditWebsite(website)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteWebsite(website.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // 在渲染标签页面时使用新的函数
  const renderTabs = () => {
    switch (activeTab) {
      case 'software': 
        return renderSoftwareTab();
      case 'tags':
        return renderTagsTab();
      case 'os':
        return renderOSTab();
      case 'ads':
        return renderAdsTab();
      case 'websites':
        return renderWebsiteTab();
      case 'categories':
        return renderCategoriesTab();
      default:
        return null;
    }
  };

  // 软件管理标签页内容
  const renderSoftwareTab = () => {
    // 筛选和排序软件列表
    const filteredAndSortedSoftware = software
      .filter(item =>
        item.name.toLowerCase().includes(softwareSearchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(softwareSearchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA < nameB) {
          return softwareSortOrder === 'asc' ? -1 : 1;
        }
        if (nameA > nameB) {
          return softwareSortOrder === 'asc' ? 1 : -1;
        }
        return 0;
      });

    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {editingSoftware ? '编辑软件' : '添加新软件'}
        </h2>
        
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              软件名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newSoftware.name}
              onChange={e => setNewSoftware({...newSoftware, name: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              软件描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={newSoftware.description}
              onChange={e => setNewSoftware({...newSoftware, description: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              分类 <span className="text-red-500">*</span>
            </label>
            <select
              value={newSoftware.category_id}
              onChange={e => setNewSoftware({...newSoftware, category_id: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">-- 选择分类 --</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              操作系统 <span className="text-red-500">*</span>
            </label>
            <select
              value={newSoftware.os_id}
              onChange={e => setNewSoftware({...newSoftware, os_id: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">-- 选择操作系统 --</option>
              {operatingSystems.map(os => (
                <option key={os.id} value={os.id}>
                  {os.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              标签
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    if (selectedTags.includes(tag.id)) {
                      setSelectedTags(prev => prev.filter(id => id !== tag.id));
                    } else {
                      setSelectedTags(prev => [...prev, tag.id]);
                    }
                  }}
                  className={clsx(
                    "px-3 py-1 rounded-full text-sm",
                    selectedTags.includes(tag.id)
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  )}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              图标 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={iconUrlInput}
                onChange={e => setIconUrlInput(e.target.value)}
                placeholder="输入图标URL"
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleIconChange}
                  className="hidden"
                  id="icon-upload"
                />
                <label
                  htmlFor="icon-upload"
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload size={16} />
                  上传
                </label>
              </div>
              <button
                type="button"
                onClick={handleIconUrlAdd}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                添加
              </button>
            </div>
            {newSoftware.icon_url && (
              <div className="mt-2">
                <img
                  src={newSoftware.icon_url}
                  alt="图标预览"
                  className="w-20 h-20 object-cover rounded"
                />
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              截图
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={screenshotUrlInput}
                onChange={e => setScreenshotUrlInput(e.target.value)}
                placeholder="输入截图URL"
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotsChange}
                  className="hidden"
                  id="screenshots-upload"
                  multiple
                />
                <label
                  htmlFor="screenshots-upload"
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload size={16} />
                  上传
                </label>
              </div>
              <button
                type="button"
                onClick={handleScreenshotUrlAdd}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                添加
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {newSoftware.screenshots?.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`截图 ${index + 1}`}
                    className="w-20 h-20 object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNewSoftware({
                        ...newSoftware,
                        screenshots: newSoftware.screenshots?.filter((_, i) => i !== index)
                      });
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              直接下载链接
            </label>
            <input
              type="url"
              value={newSoftware.direct_download_url}
              onChange={e => setNewSoftware({...newSoftware, direct_download_url: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              网盘下载链接
            </label>
            <input
              type="url"
              value={newSoftware.cloud_download_url}
              onChange={e => setNewSoftware({...newSoftware, cloud_download_url: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Added Tutorial URL input field for Software */}
          <div className="mb-4">
            <label className="block text-green-600 font-medium mb-2">
              使用教程链接 (选填)
            </label>
            <input
              type="url"
              value={newSoftware.tutorial_url || ''}
              onChange={e => setNewSoftware({...newSoftware, tutorial_url: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入教程页面的完整URL"
            />
          </div>

          <div className="flex justify-end gap-2">
            {editingSoftware ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSoftware(null);
                    setNewSoftware({
                      name: '',
                      description: '',
                      category_id: '',
                      os_id: '',
                      icon_url: '',
                      screenshots: [],
                      direct_download_url: '',
                      cloud_download_url: '',
                      tags: [],
                      tutorial_url: '', // Added tutorial_url
                    });
                    setSelectedTags([]);
                    setIconUrlInput(''); // Clear icon URL input
                    setScreenshotUrlInput(''); // Clear screenshot URL input
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  更新软件
                </button>
              </>
            ) : (
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                添加软件
              </button>
            )}
          </div>
        </form>

        <h2 className="text-xl font-semibold mb-4">软件列表</h2>
        
        {/* 搜索和排序控件 */}
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="搜索软件名称或描述..."
            className="flex-grow p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={softwareSearchTerm}
            onChange={e => setSoftwareSearchTerm(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setSoftwareSortOrder('asc')}
              className={`px-4 py-2 rounded ${softwareSortOrder === 'asc' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              A-Z
            </button>
            <button
              onClick={() => setSoftwareSortOrder('desc')}
              className={`px-4 py-2 rounded ${softwareSortOrder === 'desc' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Z-A
            </button>
          </div>
        </div>

        {filteredAndSortedSoftware.length === 0 ? (
          <p className="text-gray-500">未找到匹配的软件或暂无数据</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    图标
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    分类
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作系统
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    标签
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    推荐
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAndSortedSoftware.map(item => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.icon_url ? (
                        <img 
                          src={item.icon_url} 
                          alt={item.name} 
                          className="w-10 h-10 object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center">
                          <LinkIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {item.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.categories?.name || '未分类'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.operating_systems?.name || '未知'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {item.software_tags?.map(tag => (
                          <span
                            key={tag.tags.id}
                            className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800"
                          >
                            {tag.tags.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => toggleRecommendation(item.id, !item.is_recommended)}
                        className={clsx(
                          "px-3 py-1 rounded-md text-sm",
                          item.is_recommended
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        )}
                      >
                        {item.is_recommended ? "已推荐" : "推荐"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // 标签管理标签页内容
  const renderTagsTab = () => {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {editingTag ? '编辑标签' : '添加新标签'}
        </h2>
        
        <form onSubmit={e => {
          e.preventDefault();
          if (editingTag) {
            handleEditTag(editingTag);
          } else {
            handleAddTag();
          }
        }} className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              标签名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editingTag ? editingTag.name : newTag}
              onChange={e => {
                if (editingTag) {
                  setEditingTag({...editingTag, name: e.target.value});
                } else {
                  setNewTag(e.target.value);
                }
              }}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            {editingTag ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditingTag(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  更新标签
                </button>
              </>
            ) : (
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                添加标签
              </button>
            )}
          </div>
        </form>

        <h2 className="text-xl font-semibold mb-4">标签列表</h2>
        
        {tags.length === 0 ? (
          <p className="text-gray-500">暂无标签数据</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tags.map(tag => (
                  <tr key={tag.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{tag.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{tag.slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingTag(tag)}
                        className="text-blue-600 hover:text-blue-800 mr-4"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // 操作系统管理标签页内容
  const renderOSTab = () => {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {editingOS ? '编辑操作系统' : '添加新操作系统'}
        </h2>
        
        <form onSubmit={e => {
          e.preventDefault();
          if (editingOS) {
            handleEditOS(editingOS);
          } else {
            handleAddOS();
          }
        }} className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              操作系统名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editingOS ? editingOS.name : newOS}
              onChange={e => {
                if (editingOS) {
                  setEditingOS({...editingOS, name: e.target.value});
                } else {
                  setNewOS(e.target.value);
                }
              }}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            {editingOS ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditingOS(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  更新系统
                </button>
              </>
            ) : (
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                添加系统
              </button>
            )}
          </div>
        </form>

        <h2 className="text-xl font-semibold mb-4">操作系统列表</h2>
        
        {operatingSystems.length === 0 ? (
          <p className="text-gray-500">暂无操作系统数据</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {operatingSystems.map(os => (
                  <tr key={os.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{os.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingOS(os)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteOS(os)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // 广告管理标签页内容
  const renderAdsTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">
            {editingAd ? '编辑广告' : '添加新广告'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">广告图片</label>
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  value={editingAd ? (editingAd.image_url || '') : (newAd.image_url || '')}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (editingAd) {
                      setEditingAd(prev => ({ ...prev!, image_url: value }));
                    } else {
                      setNewAd(prev => ({ ...prev, image_url: value }));
                    }
                  }}
                  placeholder="输入图片URL或上传"
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAdImageChange}
                    className="hidden"
                    id="ad-image-upload"
                  />
                  <label
                    htmlFor="ad-image-upload"
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer inline-flex items-center gap-2"
                  >
                    <Upload size={16} />
                    上传
                  </label>
                </div>
                {/* The "添加URL" button that was here is now removed */}
              </div>
              {(editingAd?.image_url || newAd.image_url) && (
                <div className="mt-2">
                  <img
                    src={editingAd ? editingAd.image_url : (newAd.image_url || '')}
                    alt="广告图片预览"
                    className="w-40 h-20 object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://via.placeholder.com/160x80?text=图片加载失败";
                      (e.target as HTMLImageElement).alt = "图片加载失败";
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">广告链接</label>
              <input
                type="text"
                value={editingAd ? (editingAd.link || '') : (newAd.link || '')}
                onChange={(e) => {
                  const value = e.target.value;
                  if (editingAd) {
                    setEditingAd(prev => ({ ...prev!, link: value }));
                  } else {
                    setNewAd(prev => ({ ...prev, link: value }));
                  }
                }}
                placeholder="输入广告链接"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">广告标题</label>
              <input
                type="text"
                value={editingAd ? (editingAd.title || '') : (newAd.title || '')}
                onChange={(e) => {
                  const value = e.target.value;
                  if (editingAd) {
                    setEditingAd(prev => ({ ...prev!, title: value }));
                  } else {
                    setNewAd(prev => ({ ...prev, title: value }));
                  }
                }}
                placeholder="输入广告标题"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">广告描述</label>
              <textarea
                value={editingAd ? (editingAd.description || '') : (newAd.description || '')}
                onChange={(e) => {
                  const value = e.target.value;
                  if (editingAd) {
                    setEditingAd(prev => ({ ...prev!, description: value }));
                  } else {
                    setNewAd(prev => ({ ...prev, description: value }));
                  }
                }}
                placeholder="输入广告描述"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
            <div className="mt-6">
              {editingAd ? (
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleUpdateAd}
                    disabled={isUploading}
                    className="flex-grow px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {isUploading ? '更新中...' : '保存更新'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAd(null);
                      // Clear newAd form fields to ensure a clean state for the next "Add New" operation
                      setNewAd({ image_url: '', link: '', title: '', description: '' });
                      // If adImageUrlInput is still used elsewhere and needs reset:
                      // setAdImageUrlInput(''); 
                    }}
                    className="flex-grow px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    disabled={isUploading}
                  >
                    取消编辑
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddAd}
                  disabled={isUploading}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {isUploading ? '添加中...' : '添加新广告'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">广告列表</h2>
            <button
              onClick={refreshAds}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              刷新列表
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">顺序</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">预览</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">链接</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {advertisements.map((ad, index) => (
                  <tr
                    key={ad.id}
                    draggable
                    onDragStart={e => handleDragStart(e, ad)}
                    onDragOver={handleDragOver}
                    onDrop={e => handleDrop(e, ad)}
                    className="hover:bg-gray-50 cursor-move"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={ad.image_url}
                        alt={ad.title || '广告图片'}
                        className="h-10 w-10 object-cover rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ad.title || '无标题'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <a
                        href={ad.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {ad.link}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => setEditingAd(ad)}
                        className="text-blue-600 hover:text-blue-800 mr-4"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteAd(ad.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // 分类管理标签页内容
  const renderCategoriesTab = () => {
    return (
      <div>
        {/* 软件分类管理 */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">软件分类管理</h2>
          
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  value={editingCategory ? editingCategory.name : newCategory.name}
                  onChange={e => 
                    editingCategory
                      ? setEditingCategory({...editingCategory, name: e.target.value})
                      : setNewCategory({...newCategory, name: e.target.value})
                  }
                  placeholder="输入软件分类名称"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {editingCategory ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateCategory}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    更新
                  </button>
                  <button
                    onClick={() => setEditingCategory(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  添加
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    名称
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map(category => (
                  <tr key={category.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {category.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 网站分类管理 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">网站分类管理</h2>
          
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  value={editingWebsiteCategory ? editingWebsiteCategory.name : newWebsiteCategory.name}
                  onChange={e => 
                    editingWebsiteCategory
                      ? setEditingWebsiteCategory({...editingWebsiteCategory, name: e.target.value})
                      : setNewWebsiteCategory({...newWebsiteCategory, name: e.target.value})
                  }
                  placeholder="输入网站分类名称"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {editingWebsiteCategory ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateWebsiteCategory}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    更新
                  </button>
                  <button
                    onClick={() => setEditingWebsiteCategory(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddWebsiteCategory}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  添加
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    标识
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {websiteCategories.map(category => (
                  <tr key={category.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {category.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {category.slug}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingWebsiteCategory(category)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteWebsiteCategory(category.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">管理面板</h1>
      
      {renderNavigation()}

      {renderTabs()}
    </div>
  );
};

export default Admin;

// 简单的广告管理组件，不依赖后端API
const SimpleAdManager = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<Advertisement | null>(null);
  const { advertisements, setAdvertisements } = useAdvertisements();

  // 加载广告列表
  const loadAdvertisements = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      // 确保每个广告都有display_order
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

      setAdvertisements(sortedAds);
    } catch (error) {
      console.error('Error loading advertisements:', error);
      toast.error('加载广告失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadAdvertisements();
  }, []);

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, ad: Advertisement) => {
    setDraggedItem(ad);
    e.dataTransfer.setData('text/plain', ad.id);
  };

  // 拖拽经过
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // 拖拽放置
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetAd: Advertisement) => {
    e.preventDefault();
    if (!draggedItem) return;

    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId === targetAd.id) return;

    try {
      // 找到被拖拽的广告和目标位置
      const draggedIndex = advertisements.findIndex(ad => ad.id === draggedId);
      const targetIndex = advertisements.findIndex(ad => ad.id === targetAd.id);
      
      if (draggedIndex === -1 || targetIndex === -1) return;

      // 创建新的广告数组
      const newAds = [...advertisements];
      const [removed] = newAds.splice(draggedIndex, 1);
      newAds.splice(targetIndex, 0, removed);

      // 更新所有广告的display_order
      const updatedAds = newAds.map((ad, index) => ({
        ...ad,
        display_order: index
      }));

      // 更新本地状态
      setAdvertisements(updatedAds);

      // 更新数据库中的顺序
      const updatePromises = updatedAds.map(ad => 
        supabase
          .from('advertisements')
          .update({ display_order: ad.display_order })
          .eq('id', ad.id)
      );

      await Promise.all(updatePromises);
      toast.success('广告顺序已更新');

      // 重新加载广告列表以确保顺序正确
      await loadAdvertisements();
    } catch (error) {
      console.error('Error updating advertisement order:', error);
      toast.error('更新广告顺序失败');
      // 发生错误时重新加载数据
      loadAdvertisements();
    }
  };

  // 刷新广告列表
  const refreshAds = () => {
    toast.promise(
      loadAdvertisements(),
      {
        loading: '正在刷新广告列表...',
        success: '广告列表已刷新',
        error: '刷新广告列表失败'
      }
    );
  };

  return (
    <div className="p-4 bg-white rounded-lg max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">赞助推荐</h2>
        <button
          onClick={refreshAds}
          className="text-sm px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
          刷新
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : advertisements.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">暂无广告内容</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {advertisements.map(ad => (
            <div
              key={ad.id}
              className="bg-gray-50 p-3 rounded-lg shadow-sm border border-gray-100 cursor-move hover:border-blue-200"
              draggable
              onDragStart={e => handleDragStart(e, ad)}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, ad)}
            >
              <div className="relative">
                {ad.image_url ? (
                  <img
                    src={ad.image_url}
                    alt={ad.title || '广告图片'}
                    className="w-full h-32 object-cover rounded-md mb-2"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-200 rounded-md flex items-center justify-center mb-2">
                    <ImagePlus className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="absolute top-1 right-1 bg-gray-200/70 text-gray-700 px-1.5 py-0.5 rounded text-xs">
                  {ad.display_order !== undefined ? ad.display_order + 1 : '?'}
                </div>
              </div>
              <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">{ad.title || '无标题'}</h3>
              <a
                href={ad.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 truncate block"
              >
                {ad.link}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// SimpleAdManager 组件导出
export { SimpleAdManager };