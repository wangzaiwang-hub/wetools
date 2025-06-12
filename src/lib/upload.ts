import { supabase } from './supabase';

/**
 * 上传图片到Supabase存储
 * @param file 要上传的文件
 * @param folder 存储目录（例如'ads'或'website-screenshots'）
 * @param maxRetries 最大重试次数
 * @param retryDelay 重试延迟（毫秒）
 * @returns 上传后的文件URL和可能的错误
 */
export const uploadImage = async (
  file: File,
  folder: string = 'ads',
  maxRetries = 3,
  retryDelay = 1000
): Promise<{ url?: string; error?: Error }> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 生成唯一文件名
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 10);
      const fileName = `${timestamp}-${randomId}-${file.name.replace(/\s+/g, '_')}`;
      const filePath = `${folder}/${fileName}`;
      
      console.log(`尝试上传图片 (第${attempt}次)...`, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        path: filePath
      });
      
      // 上传文件到Supabase存储
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('software-images')
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        throw new Error(`上传失败: ${uploadError.message}`);
      }

      if (!uploadData || !uploadData.path) {
        throw new Error('上传成功但未返回有效路径');
      }
      
      console.log('文件上传成功，路径:', uploadData.path);

      // 获取公共URL
      const { data: urlData } = supabase.storage
        .from('software-images')
        .getPublicUrl(uploadData.path);
      
      if (!urlData || !urlData.publicUrl) {
        throw new Error('无法获取公共URL');
      }
      
      console.log('获取到公共URL:', urlData.publicUrl);
      
      // 尝试验证URL是否可访问（可选，如果导致性能问题可以注释掉）
      try {
        const response = await fetch(urlData.publicUrl, { 
          method: 'HEAD', 
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (!response.ok) {
          console.warn(`URL可能无法访问: ${response.status} ${response.statusText}`);
        }
      } catch (validateError) {
        console.warn('URL验证失败，但将继续使用:', validateError);
      }
      
      console.log('图片上传成功:', urlData.publicUrl);
      return { url: urlData.publicUrl };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`上传失败 (第${attempt}次):`, lastError);
      
      if (attempt < maxRetries) {
        console.log(`等待${retryDelay}ms后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  return { error: lastError || new Error('图片上传失败，已达到最大重试次数') };
}; 