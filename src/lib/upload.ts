import { supabase } from './supabase';

/**
 * 上传图片到Supabase存储
 * @param file 要上传的文件
 * @param folder 存储目录（例如'ads'或'website-screenshots'）
 * @returns 上传后的文件URL和可能的错误
 */
export const uploadImage = async (
  file: File,
  folder: string = 'ads'
): Promise<{ url?: string; error?: Error }> => {
  try {
    // 生成唯一文件名
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const originalName = file.name;
    const fileNameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    const fileName = `${timestamp}-${randomId}-${fileNameWithoutExt.replace(/\s+/g, '_')}.webp`;
    const filePath = `${folder}/${fileName}`;
    
    console.log(`尝试上传图片...`, {
      originalFileName: file.name,
      uploadFileName: fileName,
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
    
    return { url: urlData.publicUrl };
  } catch (error) {
    console.error('Image upload failed:', error);
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}; 