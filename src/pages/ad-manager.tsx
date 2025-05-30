import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import SupabaseStatusChecker from '@/components/SupabaseStatusChecker';
import { createClient } from '@supabase/supabase-js';

// 广告项类型定义
interface AdItem {
  id: string;
  image_url: string;
  link: string;
  created_at?: string;
  upload_verified: boolean;
}

// 本地存储键
const LOCAL_STORAGE_KEY = 'saved_advertisements';

const AdManager = () => {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [newAdImage, setNewAdImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [adLink, setAdLink] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLink, setEditLink] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [editingAd, setEditingAd] = useState<AdItem | null>(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');

  // 创建直接的Supabase客户端
  const supabaseDirectUrl = 'https://qkfzknvbibzsmzfcrysb.supabase.co';
  const supabaseDirectKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrZnprbnZiaWJ6c216ZmNyeXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0NTExMzMsImV4cCI6MjA1NjAyNzEzM30.vfzNUZtA0Rsw1tMCHUCKropd9ufEN04ZT-Pklz_ONdo';
  const directSupabase = createClient(supabaseDirectUrl, supabaseDirectKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js/2.39.7',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  // 重试函数
  const retryOperation = async (operation: () => Promise<any>, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  };

  // 初始加载广告数据
  useEffect(() => {
    // 加载广告
    loadAds();
  }, []);

  // 加载广告数据
  const loadAds = async () => {
    try {
      console.log("尝试从Supabase获取广告数据...");
      
      // 优先从Supabase广告表获取数据
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Supabase查询错误:", error.message);
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log("成功从Supabase获取广告数据:", data.length, "条");
        setAds(data);
        // 同步更新本地存储
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        return;
      }
      
      // 如果Supabase没有数据，尝试从软件截图存储桶获取
      await fetchFromScreenshotsBackup();
    } catch (error) {
      console.error("从Supabase获取广告数据失败:", error);
      // 尝试从API获取
      await fetchFromApi();
    }
  };

  // 从软件截图存储桶获取备用图片
  const fetchFromScreenshotsBackup = async () => {
    try {
      console.log("尝试从软件截图存储桶获取备用图片...");
      
      // 首先尝试获取根目录下的文件列表
      let { data, error } = await supabase.storage
        .from('software-images')
        .list('', {
          limit: 20,
          sortBy: { column: 'name', order: 'desc' }
        });
      
      if (error) {
        console.error("获取存储桶根目录文件列表失败:", error.message);
        throw error;
      }
      
      // 如果根目录没有找到图片文件，再尝试ads子目录
      if (!data || data.length === 0 || !data.some(file => file.name.endsWith('.jpg') || file.name.endsWith('.png') || file.name.endsWith('.jpeg') || file.name.endsWith('.gif'))) {
        console.log("根目录未找到图片，尝试ads子目录...");
        
        const result = await supabase.storage
          .from('software-images')
          .list('ads', {
            limit: 20,
            sortBy: { column: 'name', order: 'desc' }
          });
        
        if (result.error) {
          console.error("获取ads子目录文件列表失败:", result.error.message);
        } else if (result.data && result.data.length > 0) {
          console.log("在ads子目录找到", result.data.length, "个文件");
          data = result.data;
        }
      }
      
      // 筛选出图片文件
      const imageFiles = data?.filter(file => 
        file.name.endsWith('.jpg') || 
        file.name.endsWith('.png') || 
        file.name.endsWith('.jpeg') || 
        file.name.endsWith('.gif')
      );
      
      if (imageFiles && imageFiles.length > 0) {
        console.log("从存储桶获取了", imageFiles.length, "张图片");
        
        // 创建广告项
        const backupAds = await Promise.all(imageFiles.map(async (file, index) => {
          // 构建文件路径，添加ads/前缀如果需要
          const filePath = file.name;
          
          // 获取公共URL
          const { data: urlData } = supabase.storage
            .from('software-images')
            .getPublicUrl(filePath);
          
          return {
            id: `backup-${index}`,
            image_url: urlData.publicUrl,
            link: 'https://example.com/software',
            created_at: new Date().toISOString(),
            upload_verified: true
          };
        }));
        
        setAds(backupAds);
        // 同步更新本地存储
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(backupAds));
        return;
      }
      
      // 如果存储桶也没有数据，尝试从API获取
      await fetchFromApi();
    } catch (error) {
      console.error("从存储桶获取数据失败:", error);
      await fetchFromApi();
    }
  };

  // 从API获取广告数据
  const fetchFromApi = async () => {
    try {
      console.log("尝试从API获取广告数据...");
      
      // 尝试从API获取广告数据
      const response = await fetch('/api/ads', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
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

      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        console.log("成功从API获取广告数据");
        setAds(data);
        // 同步更新本地存储
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      } else {
        // 如果API返回空数据，尝试从本地存储加载
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error("从API获取广告数据失败:", error);
      // 从本地存储加载
      loadFromLocalStorage();
    }
  };

  // 从本地存储加载广告数据
  const loadFromLocalStorage = () => {
    try {
      console.log("尝试从本地存储加载广告数据...");
      const savedAds = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedAds) {
        const parsedAds = JSON.parse(savedAds);
        if (Array.isArray(parsedAds) && parsedAds.length > 0) {
          console.log("从本地存储加载数据成功");
          setAds(parsedAds);
          return;
        }
      }
      
      // 如果本地存储没有数据，使用默认数据
      console.log("使用默认广告数据");
      setAds([
        {
          id: '1',
          image_url: 'https://images.unsplash.com/photo-1603899122634-f086ca5f5ddd?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8c29mdHdhcmV8ZW58MHx8MHx8&auto=format&fit=crop&w=800&q=60',
          link: 'https://example.com/software-promo',
          upload_verified: false
        },
        {
          id: '2',
          image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8NHx8Y29tcHV0ZXIlMjBwcm9ncmFtbWluZ3xlbnwwfHwwfHw%3D&auto=format&fit=crop&w=800&q=60',
          link: 'https://example.com/programming-tools',
          upload_verified: false
        },
        {
          id: '3',
          image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MTB8fHRlY2h8ZW58MHx8MHx8&auto=format&fit=crop&w=800&q=60',
          link: 'https://example.com/tech-gadgets',
          upload_verified: false
        }
      ]);
    } catch (error) {
      console.error("从本地存储加载广告数据失败:", error);
    }
  };

  // 处理图片选择
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // 验证文件大小
      if (file.size > 5 * 1024 * 1024) {
        toast.error('图片大小不能超过5MB');
        return;
      }
      
      setNewAdImage(file);
      
      // 创建本地预览URL
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPreviewUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 检查Supabase连接
  const checkSupabaseConnection = async () => {
    try {
      // 先尝试获取存储桶列表
      const { data: buckets, error: bucketsError } = await directSupabase.storage
        .listBuckets();

      if (bucketsError) {
        console.error('获取存储桶列表失败:', bucketsError);
        throw bucketsError;
      }

      // 检查software-images桶是否存在
      const softwareImagesBucket = buckets?.find(bucket => bucket.name === 'software-images');
      if (!softwareImagesBucket) {
        throw new Error('找不到software-images存储桶');
      }

      // 尝试列出software-images桶中的文件
      const { data, error } = await directSupabase.storage
        .from('software-images')
        .list();
      
      if (error) {
        console.error('列出文件失败:', error);
        setConnectionError('无法连接到Supabase存储: ' + error.message);
        setIsSupabaseConnected(false);
        return false;
      }
      
      console.log('Supabase连接成功，找到', data?.length || 0, '个文件');
      setIsSupabaseConnected(true);
      setConnectionError('');
      return true;
    } catch (error) {
      console.error('连接Supabase时出错:', error);
      setConnectionError('连接Supabase时出错: ' + (error instanceof Error ? error.message : String(error)));
      setIsSupabaseConnected(false);
      return false;
    }
  };

  // 在组件加载时检查连接
  useEffect(() => {
    checkSupabaseConnection();
  }, []);

  // 修改handleAddAd函数
  const handleAddAd = async () => {
    if (!newAdImage) {
      toast.error('请选择广告图片');
      return;
    }

    if (!adLink) {
      toast.error('请输入广告链接');
      return;
    }

    if (!adLink.startsWith('http://') && !adLink.startsWith('https://')) {
      toast.error('链接必须以 http:// 或 https:// 开头');
      return;
    }

    try {
      setIsUploading(true);
      toast.loading('正在上传图片...');

      // 检查存储桶是否存在
      const { data: buckets, error: bucketsError } = await directSupabase.storage
        .listBuckets();

      if (bucketsError) {
        console.error('获取存储桶列表失败:', bucketsError);
        toast.dismiss();
        toast.error('无法连接到存储服务');
        return;
      }

      const softwareImagesBucket = buckets?.find(bucket => bucket.name === 'software-images');
      if (!softwareImagesBucket) {
        console.error('找不到software-images存储桶');
        toast.dismiss();
        toast.error('存储桶不存在');
        return;
      }

      // 使用软件上传的路径格式
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 10);
      const fileName = `${timestamp}-${randomId}-${newAdImage.name.replace(/\s+/g, '_')}`;
      // 不使用ads/子目录，直接上传到根目录
      const adPath = fileName;
      
      console.log('准备上传文件:', {
        fileName: newAdImage.name,
        fileSize: newAdImage.size,
        fileType: newAdImage.type,
        path: adPath,
        bucket: 'software-images'
      });
      
      // 输出Supabase客户端配置
      console.log('Supabase URL:', supabaseDirectUrl);

      // 使用directSupabase客户端上传
      const { error: uploadError, data: uploadData } = await directSupabase.storage
        .from('software-images')
        .upload(adPath, newAdImage, {
          contentType: newAdImage.type,
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('上传错误:', uploadError);
        toast.dismiss();
        toast.error('图片上传失败: ' + uploadError.message);
        return;
      }

      console.log('上传成功:', uploadData);

      // 获取公共URL
      const { data: { publicUrl } } = directSupabase.storage
        .from('software-images')
        .getPublicUrl(adPath);

      console.log('获取到公共URL:', publicUrl);

      // 验证图片是否可访问
      try {
        const response = await fetch(publicUrl);
        if (!response.ok) {
          console.error('图片URL无法访问:', response.status, response.statusText);
          toast.dismiss();
          toast.error('图片上传成功但无法访问，请重试');
          return;
        }
        console.log('图片URL可以正常访问');
      } catch (error) {
        console.error('验证图片URL时出错:', error);
        toast.dismiss();
        toast.error('无法验证图片URL，请重试');
        return;
      }

      toast.dismiss();
      toast.loading('正在保存广告数据...');

      // 创建新广告对象
      const newAd = {
        image_url: publicUrl,
        link: adLink,
        created_at: new Date().toISOString(),
        upload_verified: true,
        active: true
      };

      console.log('准备保存广告数据:', newAd);

      // 调试Supabase表结构
      try {
        console.log('检查advertisements表是否存在...');
        const { count, error: countError } = await directSupabase
          .from('advertisements')
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          console.error('检查advertisements表失败:', countError);
        } else {
          console.log('advertisements表存在，当前记录数:', count);
        }
      } catch (debugError) {
        console.error('调试表结构时出错:', debugError);
      }

      // 使用directSupabase保存数据
      const { data: savedAd, error: saveError } = await directSupabase
        .from('advertisements')
        .insert([newAd])
        .select()
        .single();

      if (saveError) {
        console.error('保存广告数据失败:', saveError);
        
        // 查看错误类型，尝试解决
        if (saveError.code === '42P01') { // 表不存在错误
          console.log('尝试创建advertisements表...');
          try {
            // 表不存在，需要使用SQL创建表
            const { error: createError } = await directSupabase.rpc('create_advertisements_table');
            if (createError) {
              console.error('创建表失败:', createError);
              toast.dismiss();
              toast.error('无法创建数据表: ' + createError.message);
            } else {
              // 表创建成功，保存到本地以便显示
              console.log('表创建成功，保存到本地显示');
              const tempAd = {
                id: `local-${Date.now()}`,
                ...newAd
              };
              setAds(prevAds => [tempAd, ...prevAds]);
              toast.dismiss();
              toast.success('广告已临时添加(表刚创建)');
            }
          } catch (rpnError) {
            console.error('RPC调用失败:', rpnError);
          }
          return;
        }
        
        // 保存到本地存储，确保UI更新
        const localAd = {
          id: `local-${Date.now()}`,
          ...newAd
        };
        
        const updatedAds = [localAd, ...ads];
        setAds(updatedAds);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedAds));
        
        toast.dismiss();
        toast.warning('已保存到本地存储，但保存到数据库失败: ' + saveError.message);
        return;
      }

      console.log('广告数据保存成功:', savedAd);

      // 立即重新加载广告列表
      try {
        console.log('开始重新加载广告列表...');
        const { data: latestAds, error: loadError } = await directSupabase
          .from('advertisements')
          .select('*')
          .order('created_at', { ascending: false });

        if (loadError) {
          console.error('重新加载广告列表失败:', loadError);
          // 如果重新加载失败，直接更新本地状态
          const updatedAds = savedAd ? [savedAd, ...ads.filter(ad => ad.id !== savedAd.id)] : ads;
          setAds(updatedAds);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedAds));
        } else if (latestAds) {
          console.log('已重新加载最新广告列表:', latestAds);
          setAds(latestAds);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(latestAds));
        }
      } catch (reloadError) {
        console.error('尝试重新加载广告列表时出错:', reloadError);
        // 更新本地状态
        if (savedAd) {
          const updatedAds = [savedAd, ...ads.filter(ad => ad.id !== savedAd.id)];
          setAds(updatedAds);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedAds));
        }
      }

      toast.dismiss();
      toast.success('广告添加成功');

      // 重置表单
      setNewAdImage(null);
      setPreviewUrl('');
      setAdLink('');
    } catch (error) {
      console.error('添加广告过程中出错:', error);
      toast.dismiss();
      toast.error('添加广告失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsUploading(false);
    }
  };

  // 编辑广告
  const handleEditAd = (ad: AdItem) => {
    try {
      console.log('编辑广告开始处理:', ad.id);
      
      // 立即更新状态，不使用延迟
      // 使用对象复制确保不会有引用问题
      const adToEdit = {...ad};
      
      // 直接更新状态
      setEditingAd(adToEdit);
      setEditLink(adToEdit.link || '');
      
      // 强制更新UI
      setTimeout(() => {
        console.log('检查编辑状态:', editingAd?.id);
        // 滚动到编辑区域
        const editForm = document.getElementById('editForm');
        if (editForm) {
          editForm.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
      console.log('编辑广告处理完成');
    } catch (error) {
      console.error('编辑广告出错:', error);
      toast.error('启动编辑模式失败');
    }
  };

  // 保存编辑后的广告
  const handleSaveEdit = async () => {
    if (!editingAd) {
      console.error('没有正在编辑的广告');
      toast.error('没有正在编辑的广告');
      return;
    }
    
    if (!editLink) {
      toast.error('请输入广告链接');
      return;
    }

    // 验证链接格式
    if (!editLink.startsWith('http://') && !editLink.startsWith('https://')) {
      toast.error('链接必须以 http:// 或 https:// 开头');
      return;
    }

    try {
      setIsUploading(true);
      console.log('保存广告编辑:', editingAd.id, '新链接:', editLink);
      
      // 创建更新后的广告对象
      const updatedAd = {
        ...editingAd,
        link: editLink
      };

      // 尝试调用API更新广告
      try {
        const response = await fetch(`/api/ads/${editingAd.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ link: editLink })
        });

        if (!response.ok) {
          console.warn('API更新广告失败，状态码:', response.status);
          throw new Error('API更新广告失败');
        } else {
          console.log('API更新广告成功');
        }
      } catch (error) {
        console.error('API更新广告失败:', error);
        // 即使API失败，也继续执行本地更新
      }

      // 更新本地状态
      setAds(prevAds => {
        const newAds = prevAds.map(ad => ad.id === editingAd.id ? updatedAd : ad);
        console.log('更新后的广告列表:', newAds.length);
        return newAds;
      });

      // 更新本地存储
      const updatedAds = ads.map(ad => ad.id === editingAd.id ? updatedAd : ad);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedAds));
      console.log('已更新本地存储');

      // 重置编辑状态
      setEditingAd(null);
      setEditLink('');
      toast.success('广告更新成功');
    } catch (error) {
      console.error('更新广告失败:', error);
      toast.error('更新广告失败');
    } finally {
      setIsUploading(false);
    }
  };

  // 删除广告
  const handleDeleteAd = async (id: string) => {
    if (!confirm('确定要删除这个广告吗？')) return;
    
    try {
      setIsUploading(true);
      
      // 尝试调用API删除广告
      try {
        const response = await fetch(`/api/ads/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('API删除广告失败');
        }
      } catch (error) {
        console.error('API删除广告失败:', error);
        // 即使API失败，也继续执行本地删除
      }

      // 更新本地状态
      setAds(prevAds => prevAds.filter(ad => ad.id !== id));

      // 更新本地存储
      const updatedAds = ads.filter(ad => ad.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedAds));

      toast.success('广告删除成功');
    } catch (error) {
      console.error('删除广告失败:', error);
      toast.error('删除广告失败');
    } finally {
      setIsUploading(false);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    console.log('取消编辑');
    try {
      // 确保状态完全重置
      setEditingAd(null);
      setEditLink('');
      
      // 添加反馈提示
      toast.success('已取消编辑');
      
      // 强制更新后检查状态
      setTimeout(() => {
        console.log('编辑状态已重置:', editingAd === null);
      }, 50);
    } catch (error) {
      console.error('取消编辑时出错:', error);
      // 强制重置状态
      setEditingAd(null);
    }
  };

  // 重新尝试上传图片
  const handleRetryUpload = async (ad: AdItem) => {
    if (!ad.image_url || ad.upload_verified) return;
    
    try {
      setIsUploading(true);
      toast.loading('正在尝试重新上传图片...');
      
      // 检查是否为Data URL (base64)
      if (ad.image_url.startsWith('data:')) {
        // 从Data URL创建Blob
        const response = await fetch(ad.image_url);
        const blob = await response.blob();
        
        // 创建随机文件名
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 10);
        const fileName = `retry-${timestamp}-${randomId}.jpg`;
        
        // 创建File对象
        const file = new File([blob], fileName, { type: blob.type });
        
        // 尝试上传
        const imageUrl = await uploadWithFormData(file);
        
        if (imageUrl) {
          // 上传成功，更新广告数据
          const updatedAd = { 
            ...ad, 
            image_url: imageUrl, 
            upload_verified: true 
          };
          
          // 更新本地状态
          setAds(prevAds => prevAds.map(item => 
            item.id === ad.id ? updatedAd : item
          ));
          
          // 更新本地存储
          const updatedAds = ads.map(item => 
            item.id === ad.id ? updatedAd : item
          );
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedAds));
          
          // 尝试更新Supabase
          try {
            const { data, error } = await supabase
              .from('advertisements')
              .upsert([{
                id: ad.id,
                image_url: imageUrl,
                link: ad.link,
                upload_verified: true,
                created_at: ad.created_at || new Date().toISOString()
              }])
              .select()
              .single();
              
            if (!error && data) {
              console.log('广告数据已同步到Supabase:', data);
            }
          } catch (dbError) {
            console.error('更新Supabase数据失败，但图片已上传:', dbError);
          }
          
          toast.dismiss();
          toast.success('图片重新上传成功');
        }
      } else {
        toast.dismiss();
        toast.error('无法从当前URL重新上传，请尝试删除并重新添加广告');
      }
    } catch (error) {
      console.error('重新上传失败:', error);
      toast.dismiss();
      toast.error('重新上传失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">广告管理</h1>
      
      {/* 显示连接状态 */}
      {connectionError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {connectionError}
              </p>
              <button
                onClick={checkSupabaseConnection}
                className="mt-2 text-sm text-red-700 underline hover:text-red-900"
              >
                重试连接
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div id="editForm" className={`bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-8 mb-8 ${editingAd ? 'ring-2 ring-blue-400 border border-blue-300' : ''}`}>
        <h2 className="text-lg font-semibold mb-4">
          {editingAd ? (
            <span className="flex items-center text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              编辑广告: {editingAd.id}
            </span>
          ) : '添加新广告'}
        </h2>
        
        <div className="space-y-4">
          {!editingAd && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">广告图片</label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="adImageInput"
                  disabled={isUploading}
                />
                <label
                  htmlFor="adImageInput"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  选择图片
                </label>
                
                {previewUrl && (
                  <div className="relative w-24 h-24">
                    <img
                      src={previewUrl}
                      alt="广告预览"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setPreviewUrl('');
                        setNewAdImage(null);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      X
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">支持 JPG、PNG 格式，大小不超过 5MB</p>
            </div>
          )}
          
          <div>
            <label htmlFor="adLink" className="block text-sm font-medium text-gray-700 mb-1">广告链接</label>
            <input
              id="adLink"
              name="adLink"
              type="url"
              value={editLink}
              onChange={(e) => setEditLink(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                [-webkit-text-size-adjust:100%]
                [text-size-adjust:100%]
                [-webkit-user-select:none]
                [user-select:none]
                touch-action-manipulation"
              disabled={isUploading}
            />
          </div>
          
          <div className="flex space-x-3">
            {editingAd ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={isUploading || !editLink}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isUploading ? '保存中...' : '保存修改'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isUploading}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  取消
                </button>
              </>
            ) : (
              <button
                onClick={handleAddAd}
                disabled={isUploading || !previewUrl || !editLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isUploading ? '上传中...' : '添加广告'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-8">
        <h2 className="text-lg font-semibold mb-4">广告列表</h2>
        
        {ads.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无广告</p>
        ) : (
          <div className="space-y-4">
            {ads.map((ad) => (
              <div key={ad.id} className={`flex items-center border rounded-lg p-4 ${
                editingAd && editingAd.id === ad.id ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-300' : 
                ad.upload_verified ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
              }`}>
                <div className="w-20 h-20 mr-4 relative">
                  <img
                    src={ad.image_url}
                    alt="广告图片"
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      console.error("图片加载失败，使用默认图片", ad.image_url);
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1603899122634-f086ca5f5ddd?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8c29mdHdhcmV8ZW58MHx8MHx8&auto=format&fit=crop&w=800&q=60';
                    }}
                  />
                  {/* 上传状态指示器 */}
                  <div className={`absolute top-0 right-0 w-4 h-4 rounded-full ${ad.upload_verified ? 'bg-green-500' : 'bg-yellow-500'}`} 
                    title={ad.upload_verified ? '图片已上传到Supabase' : '图片仅本地存储'}></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 truncate mb-1">
                    ID: {ad.id}
                    {!ad.upload_verified && <span className="ml-2 text-yellow-600 font-medium">（仅本地）</span>}
                  </p>
                  <a
                    href={ad.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate block"
                  >
                    {ad.link}
                  </a>
                  {ad.created_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      创建时间: {new Date(ad.created_at).toLocaleString()}
                    </p>
                  )}
                </div>
                
                <div className="ml-4 flex flex-col space-y-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('编辑按钮被点击:', ad.id);
                      if (!isUploading && editingAd === null) {
                        handleEditAd(ad);
                      } else {
                        console.log('按钮被禁用,无法编辑:', isUploading ? '正在上传' : '已有编辑中广告');
                      }
                    }}
                    disabled={isUploading || editingAd !== null}
                    className={`px-3 py-1 ${editingAd !== null ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} rounded focus:outline-none disabled:opacity-50`}
                  >
                    {editingAd && editingAd.id === ad.id ? '编辑中...' : '编辑'}
                  </button>
                  <button
                    onClick={() => handleDeleteAd(ad.id)}
                    disabled={isUploading || editingAd !== null}
                    className={`px-3 py-1 ${editingAd !== null ? 'bg-red-200 text-red-400 cursor-not-allowed' : 'bg-red-100 text-red-700 hover:bg-red-200'} rounded focus:outline-none disabled:opacity-50`}
                  >
                    删除
                  </button>
                  {!ad.upload_verified && (
                    <button
                      onClick={() => handleRetryUpload(ad)}
                      disabled={isUploading || editingAd !== null}
                      className={`px-3 py-1 ${editingAd !== null ? 'bg-blue-200 text-blue-400 cursor-not-allowed' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} rounded focus:outline-none disabled:opacity-50`}
                    >
                      重新上传
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <SupabaseStatusChecker />
      
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .image-preview {
          animation: fadeIn 0.3s ease-out;
        }
        
        /* 添加CSS兼容性前缀 */
        input, button {
          -webkit-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          touch-action: manipulation;
        }
        
        img {
          -webkit-user-drag: none;
          user-select: none;
          -webkit-user-select: none;
        }
        
        /* 修复background-clip顺序 */
        .backdrop-blur {
          -webkit-background-clip: padding-box;
          background-clip: padding-box;
        }
      `}</style>
    </div>
  );
};

export default AdManager; 