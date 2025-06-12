import { supabase } from './supabase';
import { convertToWebP, isImage, isWebP } from '../utils/imageConverter';

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
      // 检查文件是否为图片
      if (!isImage(file)) {
        throw new Error('只能上传图片文件');
      }

      // 如果不是WebP格式，转换为WebP
      let fileToUpload = file;
      let conversionStats = null;
      
      if (!isWebP(file)) {
        console.log(`将图片转换为WebP格式: ${file.name}`);
        try {
          const result = await convertToWebP(file);
          fileToUpload = result.file;
          conversionStats = {
            originalSize: result.originalSize,
            newSize: result.newSize,
            compressionRatio: (result.newSize / result.originalSize * 100).toFixed(2) + '%'
          };
          console.log('图片转换成功:', conversionStats);
        } catch (conversionError) {
          console.error('图片转换失败，将使用原始文件:', conversionError);
          // 如果转换失败，继续使用原始文件
        }
      }
      
      // 生成唯一文件名（确保WebP扩展名）
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 10);
      const originalName = fileToUpload.name;
      const fileNameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
      const fileName = `${timestamp}-${randomId}-${fileNameWithoutExt.replace(/\s+/g, '_')}.webp`;
      const filePath = `${folder}/${fileName}`;
      
      console.log(`尝试上传图片 (第${attempt}次)...`, {
        originalFileName: file.name,
        uploadFileName: fileName,
        fileSize: fileToUpload.size,
        fileType: fileToUpload.type,
        path: filePath,
        ...(conversionStats ? { conversionStats } : {})
      });
      
      // 上传文件到Supabase存储
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('software-images')
        .upload(filePath, fileToUpload, {
          contentType: 'image/webp',
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