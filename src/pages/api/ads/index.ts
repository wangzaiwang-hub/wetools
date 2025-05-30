import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 确保设置正确的响应头
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  
  // 处理OPTIONS请求（预检请求）
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 处理GET请求
  if (req.method === 'GET') {
    try {
      console.log('从Supabase获取广告数据');
      
      // 先尝试从Supabase获取
      const { data: supabaseData, error: supabaseError } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (supabaseError) {
        console.error('从Supabase获取广告失败:', supabaseError);
      } else if (supabaseData && supabaseData.length > 0) {
        console.log('返回Supabase广告数据:', supabaseData.length, '条');
        return res.status(200).json(supabaseData);
      }
      
      // 如果Supabase获取失败，返回默认数据
      console.log('返回默认广告数据:', DEFAULT_ADS.length, '条');
      return res.status(200).json(DEFAULT_ADS);
    } catch (error) {
      console.error('获取广告数据失败:', error);
      return res.status(500).json({ error: '获取广告数据失败', details: String(error) });
    }
  }
  
  // 处理POST请求
  if (req.method === 'POST') {
    try {
      const { image_url, link } = req.body;
      
      if (!image_url || !link) {
        return res.status(400).json({ error: '缺少必要字段' });
      }
      
      // 尝试保存到Supabase
      let savedData = null;
      
      try {
        const { data, error } = await supabase
          .from('advertisements')
          .insert([{ image_url, link }])
          .select()
          .single();
        
        if (error) {
          console.error('Supabase保存广告失败:', error);
        } else if (data) {
          console.log('Supabase保存广告成功:', data);
          savedData = data;
        }
      } catch (supabaseError) {
        console.error('Supabase调用失败:', supabaseError);
      }
      
      // 如果Supabase保存成功，返回保存的数据
      if (savedData) {
        return res.status(201).json(savedData);
      }
      
      // 否则创建本地数据
      const newAd = {
        id: Date.now().toString(),
        image_url,
        link,
        created_at: new Date().toISOString()
      };
      
      console.log('创建本地广告数据:', newAd);
      return res.status(201).json(newAd);
    } catch (error) {
      console.error('创建广告失败:', error);
      return res.status(500).json({ error: '创建广告失败', details: String(error) });
    }
  }
  
  // 如果方法不支持，返回405
  return res.status(405).json({ error: `方法 ${req.method} 不支持` });
}