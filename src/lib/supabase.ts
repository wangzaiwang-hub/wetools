import { createClient } from '@supabase/supabase-js';

// Define backup data for when Supabase is unreachable
export const SAMPLE_ADS = [
  {
    id: '1',
    image_url: 'https://picsum.photos/800/400?random=1',
    link: 'https://example.com/ad1',
    title: '软件推广示例',
    description: '离线模式：发现最好的开发工具',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    image_url: 'https://picsum.photos/800/400?random=2',
    link: 'https://example.com/ad2',
    title: '限时特惠示例',
    description: '离线模式：折扣优惠进行中',
    created_at: new Date().toISOString()
  }
];

// 添加备用的网站统计数据
export const FALLBACK_STATS = {
  star_count: 5
};

// 添加备用的软件星级数据
export const FALLBACK_STAR_COUNTS = [
  { software_id: '00000000-0000-0000-0000-000000000001', star_count: 3 },
  { software_id: '00000000-0000-0000-0000-000000000002', star_count: 5 },
  { software_id: '00000000-0000-0000-0000-000000000003', star_count: 2 }
];

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with enhanced configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // 增加储存选项，使用本地存储而不是cookies
    storage: {
      getItem: (key) => {
        try {
          const itemStr = localStorage.getItem(key);
          if (!itemStr) return null;
          return itemStr;
        } catch (error) {
          console.warn('Error reading from local storage', error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.warn('Error writing to local storage', error);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn('Error removing from local storage', error);
        }
      }
    }
  },
  global: {
    headers: {
      'x-application-name': 'we-tools'
    },
    // Add retry logic for network instability
    fetch: (url: string, options?: RequestInit): Promise<Response> => {
      // Maximum number of retries
      const MAX_RETRIES = 3;
      
      // Retry function with exponential backoff
      const fetchWithRetry = async (attempt = 0): Promise<Response> => {
        try {
          console.log(`Attempting to connect to Supabase API (${attempt + 1}/${MAX_RETRIES + 1})...`);
          
          // Set request timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          const fetchOptions = {
            ...options,
            signal: controller.signal
          };
          
          const response = await fetch(url, fetchOptions);
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          // Check for CORS error
          if (error instanceof TypeError && error.message.includes('fetch')) {
            console.warn('Possible CORS restriction, attempting fallback');
            
            // Create a mock Response for ads endpoint
            if (url.includes('/advertisements')) {
              console.log('Returning mock ad data');
              return new Response(JSON.stringify(SAMPLE_ADS), {
                status: 200,
                headers: {
                  'Content-Type': 'application/json'
                }
              });
            }
            
            // 处理RPC调用失败的情况
            if (url.includes('/rpc/get_software_star_counts')) {
              console.log('Returning mock star count data');
              return new Response(JSON.stringify(FALLBACK_STAR_COUNTS), {
                status: 200,
                headers: {
                  'Content-Type': 'application/json'
                }
              });
            }
            
            // 处理网站统计数据失败的情况
            if (url.includes('/website_stats')) {
              console.log('Returning mock website stats');
              return new Response(JSON.stringify(FALLBACK_STATS), {
                status: 200,
                headers: {
                  'Content-Type': 'application/json'
                }
              });
            }
          }
          
          if (attempt < MAX_RETRIES) {
            // Exponential backoff: 200ms, 400ms, 800ms
            const delay = 200 * Math.pow(2, attempt);
            console.log(`Supabase request failed, retrying in ${delay}ms (${attempt + 1}/${MAX_RETRIES})`, error);
            
            return new Promise(resolve => {
              setTimeout(() => resolve(fetchWithRetry(attempt + 1)), delay);
            });
          }
          
          console.error('Supabase request failed after maximum retries', error);
          
          // Return a mock error response instead of throwing
          return new Response(JSON.stringify({
            error: 'Unable to connect to Supabase service',
            message: 'Please check your network connection or try again later',
            details: String(error)
          }), {
            status: 503,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
      };
      
      return fetchWithRetry();
    }
  }
});

/**
 * 获取软件的下载URL
 * @param softwareId 软件ID
 * @returns 下载URL和可能的错误
 */
export const getSoftwareDownloadUrl = async (softwareId: string) => {
  try {
    const { data, error } = await supabase
      .from('software')
      .select('download_url')
      .eq('id', softwareId)
      .single();
      
    return { data, error };
  } catch (error) {
    console.error('Error getting download URL:', error);
    return { data: null, error };
  }
};

/**
 * 切换软件点赞状态
 * @param softwareId 软件ID
 * @param userId 用户ID
 * @returns 操作结果和可能的错误
 */
export const toggleSoftwareStar = async (softwareId: string, userId: string) => {
  try {
    // 检查是否已点赞
    const { data, error } = await supabase
      .from('user_stars')
      .select('id')
      .eq('software_id', softwareId)
      .eq('user_id', userId)
      .maybeSingle();
      
    if (error && error.code !== 'PGRST116') {
      return { data: null, error };
    }
    
    // 如果已点赞，则取消点赞
    if (data) {
      const { error: deleteError } = await supabase
        .from('user_stars')
        .delete()
        .eq('software_id', softwareId)
        .eq('user_id', userId);
        
      return { data: null, error: deleteError };
    } 
    // 如果未点赞，则添加点赞
    else {
      const { error: insertError } = await supabase
        .from('user_stars')
        .insert({ software_id: softwareId, user_id: userId });
        
      return { data: { id: 'new-star' }, error: insertError };
    }
  } catch (error) {
    console.error('Error toggling software star:', error);
    return { data: null, error };
  }
};

export const uploadAvatar = async (file: File, userId: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
};

/**
 * 确保必需的存储桶和文件夹结构存在
 * 在应用启动时调用，自动创建缺失的结构
 */
export const ensureStorageStructure = async () => {
  try {
    console.log('检查存储结构...');
    
    // 检查 software-images 存储桶
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('无法列出存储桶:', bucketsError);
      return { success: false, error: bucketsError };
    }
    
    const softwareImagesBucket = buckets?.find(b => b.name === 'software-images');
    
    // 如果存储桶不存在，尝试创建
    if (!softwareImagesBucket) {
      console.log('尝试创建 software-images 存储桶');
      try {
        const { error: createBucketError } = await supabase.storage.createBucket('software-images', {
          public: true,
          fileSizeLimit: 10485760 // 10MB
        });
        
        if (createBucketError) {
          console.error('创建 software-images 存储桶失败:', createBucketError);
          return { success: false, error: createBucketError };
        }
        
        console.log('成功创建 software-images 存储桶');
      } catch (error) {
        console.error('创建存储桶时出错:', error);
        return { success: false, error };
      }
    }
    
    // 检查 ads 文件夹是否存在
    try {
      const { data: folders, error: foldersError } = await supabase.storage
        .from('software-images')
        .list();
      
      if (foldersError) {
        console.error('列出 software-images 内容时出错:', foldersError);
        return { success: false, error: foldersError };
      }
      
      const adsFolder = folders?.find(item => item.name === 'ads');
      
      // 如果 ads 文件夹不存在，创建一个空文件来初始化它
      if (!adsFolder) {
        console.log('尝试创建 ads 文件夹');
        
        // 在Supabase Storage中创建文件夹需要上传一个文件
        const placeholderContent = new Blob(['placeholder'], { type: 'text/plain' });
        const placeholderFile = new File([placeholderContent], '.placeholder', { type: 'text/plain' });
        
        const { error: uploadError } = await supabase.storage
          .from('software-images')
          .upload('ads/.placeholder', placeholderFile);
        
        if (uploadError) {
          console.error('创建 ads 文件夹失败:', uploadError);
          return { success: false, error: uploadError };
        }
        
        console.log('成功创建 ads 文件夹');
      }
      
      // 确保 icons, screenshots, website-icons, website-screenshots 文件夹存在
      const requiredFolders = ['icons', 'screenshots', 'website-icons', 'website-screenshots'];
      
      for (const folderName of requiredFolders) {
        const exists = folders?.find(item => item.name === folderName);
        
        if (!exists) {
          console.log(`尝试创建 ${folderName} 文件夹`);
          
          const placeholderContent = new Blob(['placeholder'], { type: 'text/plain' });
          const placeholderFile = new File([placeholderContent], '.placeholder', { type: 'text/plain' });
          
          const { error: uploadError } = await supabase.storage
            .from('software-images')
            .upload(`${folderName}/.placeholder`, placeholderFile);
          
          if (uploadError) {
            console.warn(`创建 ${folderName} 文件夹失败:`, uploadError);
            // 继续尝试创建其他文件夹
          } else {
            console.log(`成功创建 ${folderName} 文件夹`);
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('检查文件夹结构时出错:', error);
      return { success: false, error };
    }
  } catch (error) {
    console.error('确保存储结构时出错:', error);
    return { success: false, error };
  }
};

/**
 * 会话恢复函数，用于在初始化失败时恢复会话
 * @returns 恢复结果对象，包含成功标志和会话信息
 */
export const recoverSession = async () => {
  console.log('尝试恢复会话...');
  
  try {
    // 清除可能存在的无效token
    const allKeys = Object.keys(localStorage);
    const expiredOrInvalidKeys = allKeys.filter(key => 
      key.includes('supabase.auth.token') && localStorage.getItem(key)?.includes('error')
    );
    
    if (expiredOrInvalidKeys.length > 0) {
      console.log('检测到可能无效的会话token，正在清理:', expiredOrInvalidKeys);
      expiredOrInvalidKeys.forEach(key => localStorage.removeItem(key));
    }
    
    // 检查是否有QQ登录标记
    const isQQLogin = localStorage.getItem('qq_login_attempt') === 'true';
    if (isQQLogin) {
      console.log('检测到这是QQ登录恢复尝试');
      // QQ登录相关的恢复流程，例如重新获取会话
      localStorage.removeItem('qq_login_attempt');
    }

    // 强制刷新会话
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('会话刷新失败:', error);
      
      // 在重大错误情况下进行更彻底的清理
      if (error.status === 400 || error.status === 401 || 
          error.message?.includes('token') || error.message?.includes('JWT')) {
        console.log('检测到无效令牌错误，执行全面清理');
        
        // 清理所有 supabase 相关存储
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });
      }
      
      return { success: false, error, session: null };
    }
    
    if (data && data.session) {
      console.log('会话恢复成功:', data.session.user?.email);
      return { success: true, session: data.session, error: null };
    } else {
      console.log('会话恢复尝试完成，但无有效会话');
      return { success: false, session: null, error: null };
    }
  } catch (err) {
    console.error('会话恢复过程中出错:', err);
    return { success: false, error: err as Error, session: null };
  }
};

/**
 * 标记尝试使用QQ登录
 * 用于会话恢复逻辑中识别QQ登录
 */
export const markQQLoginAttempt = () => {
  localStorage.setItem('qq_login_attempt', 'true');
};

/**
 * 清除QQ登录尝试标记
 */
export const clearQQLoginAttempt = () => {
  localStorage.removeItem('qq_login_attempt');
};