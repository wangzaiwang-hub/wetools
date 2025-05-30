import { NextApiRequest, NextApiResponse } from 'next';

// 默认广告数据，仅作为备份使用
const DEFAULT_ADS = [
  {
    id: '1',
    image_url: 'https://images.unsplash.com/photo-1603899122634-f086ca5f5ddd?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8c29mdHdhcmV8ZW58MHx8MHx8&auto=format&fit=crop&w=800&q=60',
    link: 'https://example.com/software-promo'
  },
  {
    id: '2',
    image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8NHx8Y29tcHV0ZXIlMjBwcm9ncmFtbWluZ3xlbnwwfHwwfHw%3D&auto=format&fit=crop&w=800&q=60',
    link: 'https://example.com/programming-tools'
  },
  {
    id: '3',
    image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MTB8fHRlY2h8ZW58MHx8MHx8&auto=format&fit=crop&w=800&q=60',
    link: 'https://example.com/tech-gadgets'
  }
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // 确保设置正确的响应头
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理OPTIONS请求（预检请求）
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: '无效的广告ID' });
  }
  
  // 查找广告数据
  const ad = DEFAULT_ADS.find(ad => ad.id === id);
  
  if (!ad) {
    return res.status(404).json({ error: '广告不存在' });
  }
  
  // 处理GET请求 - 获取单个广告
  if (req.method === 'GET') {
    try {
      return res.status(200).json(ad);
    } catch (error) {
      console.error('获取广告数据失败:', error);
      return res.status(500).json({ error: '获取广告数据失败' });
    }
  }
  
  // 处理PUT请求 - 更新广告
  if (req.method === 'PUT') {
    try {
      const { link } = req.body;
      
      if (!link) {
        return res.status(400).json({ error: '缺少必要字段' });
      }
      
      // 在实际应用中，这里会查询数据库并更新广告
      // 目前仅模拟更新操作
      const updatedAd = {
        ...ad,
        link,
        updated_at: new Date().toISOString()
      };
      
      console.log('更新广告:', updatedAd);
      
      // 返回一个标准格式的广告数据
      return res.status(200).json({
        id: updatedAd.id,
        image_url: updatedAd.image_url,
        link: updatedAd.link,
        created_at: updatedAd.created_at || new Date().toISOString()
      });
    } catch (error) {
      console.error('更新广告失败:', error);
      return res.status(500).json({ error: '更新广告失败' });
    }
  }
  
  // 处理DELETE请求 - 删除广告
  if (req.method === 'DELETE') {
    try {
      // 在实际应用中，这里会查询数据库并删除广告
      // 目前仅模拟删除操作
      console.log('删除广告:', id);
      
      return res.status(200).json({ message: '广告删除成功' });
    } catch (error) {
      console.error('删除广告失败:', error);
      return res.status(500).json({ error: '删除广告失败' });
    }
  }
  
  // 如果方法不支持，返回405
  return res.status(405).json({ error: `方法 ${req.method} 不支持` });
} 