import sharp from 'sharp';

/**
 * 将图片转换为WebP格式
 * @param file 原始图片文件
 * @param quality WebP质量，范围0-100，默认80
 * @returns 转换后的WebP格式文件
 */
export const convertToWebP = async (
  file: File,
  quality: number = 80
): Promise<{ file: File; originalSize: number; newSize: number }> => {
  try {
    // 读取文件内容
    const buffer = await file.arrayBuffer();
    
    // 使用sharp转换为WebP
    const webpBuffer = await sharp(Buffer.from(buffer))
      .webp({ quality }) // 设置WebP质量
      .toBuffer();
    
    // 创建新的文件名，替换原扩展名为.webp
    const originalName = file.name;
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    const newFileName = `${nameWithoutExt}.webp`;
    
    // 创建新的File对象
    const webpFile = new File([webpBuffer], newFileName, { type: 'image/webp' });
    
    // 返回转换后的文件以及原始大小和新大小（用于日志和统计）
    return {
      file: webpFile,
      originalSize: file.size,
      newSize: webpBuffer.byteLength
    };
  } catch (error) {
    console.error('图片转换为WebP格式失败:', error);
    throw error;
  }
};

/**
 * 检查文件是否为图片
 * @param file 要检查的文件
 * @returns 是否为图片
 */
export const isImage = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * 检查文件是否已经是WebP格式
 * @param file 要检查的文件
 * @returns 是否为WebP格式
 */
export const isWebP = (file: File): boolean => {
  return file.type === 'image/webp';
}; 