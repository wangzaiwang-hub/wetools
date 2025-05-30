import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: `方法 ${req.method} 不支持` });
  }
  
  try {
    // 检查Supabase连接
    let supabaseStatus = 'unknown';
    let buckets = [];
    let tables = [];
    let error = null;
    
    try {
      // 尝试获取存储桶列表
      const { data: bucketsData, error: bucketsError } = await supabase
        .storage
        .listBuckets();
      
      if (bucketsError) {
        supabaseStatus = 'error';
        error = bucketsError;
      } else {
        supabaseStatus = 'connected';
        buckets = bucketsData || [];
        
        // 尝试获取广告表
        const { data: tableData, error: tableError } = await supabase
          .from('advertisements')
          .select('count')
          .limit(1);
        
        if (tableError) {
          tables = [{ name: 'advertisements', status: 'error', error: tableError.message }];
        } else {
          tables = [{ name: 'advertisements', status: 'ok', count: tableData?.length || 0 }];
        }
      }
    } catch (e) {
      supabaseStatus = 'error';
      error = e;
    }
    
    // 构建调试信息
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      headers: {
        contentType: req.headers['content-type'],
        accept: req.headers.accept,
        userAgent: req.headers['user-agent'],
        host: req.headers.host,
      },
      supabase: {
        status: supabaseStatus,
        buckets,
        tables,
        error: error ? String(error) : null
      },
      message: 'API调试端点正常工作'
    };
    
    return res.status(200).json(debugInfo);
  } catch (error) {
    console.error('调试API错误:', error);
    return res.status(500).json({ 
      error: '调试API错误', 
      message: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : null
    });
  }
} 