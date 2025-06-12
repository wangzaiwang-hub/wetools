import { supabase } from './supabase';

/**
 * 上传图片到Supabase存储，通过Edge Function进行WebP转换
 * @param file 要上传的文件
 * @returns 上传后的文件URL和可能的错误
 */
export const uploadImage = async (
  file: File
): Promise<{ url?: string; error?: Error }> => {
  try {
    // 1. 调用Edge Function处理图片
    const formData = new FormData();
    formData.append('file', file);

    const { data, error } = await supabase.functions.invoke('convert-image', {
      body: formData,
    });

    if (error) {
      throw new Error(`Edge Function error: ${error.message}`);
    }

    if (!data.publicUrl) {
      throw new Error('Edge Function did not return a public URL.');
    }

    console.log('Image uploaded and converted successfully:', data.publicUrl);
    return { url: data.publicUrl };

  } catch (error) {
    console.error('Image upload failed:', error);
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}; 