import type { NextApiRequest, NextApiResponse } from 'next';

// 重试配置
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// 简单的延迟函数
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 百炼API的请求函数，支持重试
async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (retries <= 0) throw error;
    await wait(RETRY_DELAY);
    console.log(`重试百炼API请求，剩余尝试次数: ${retries-1}`);
    return fetchWithRetry(url, options, retries - 1);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, appId, apiKey } = req.body;

    if (!prompt || !appId || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // 设置响应头支持流式响应
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 构建请求百炼API的URL
    const url = `https://bailian.aliyuncs.com/v2/app/${appId}/services/generation`;

    // 构建请求主体，启用增量输出
    const requestBody = {
      input: { prompt },
      parameters: { incremental_output: true }
    };

    // 设置请求选项
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(requestBody)
    };

    // 发送请求到百炼API，使用重试机制
    let response;
    try {
      response = await fetchWithRetry(url, requestOptions);
    } catch (error) {
      console.error('连接百炼API失败:', error);
      return res.status(502).json({ 
        error: 'Failed to connect to Bailian API',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`百炼API错误(${response.status}):`, errorText);
      return res.status(response.status).json({ 
        error: `API request failed with status ${response.status}`,
        details: errorText
      });
    }

    // 检查是否支持流式响应
    if (response.body) {
      const reader = response.body.getReader();
      let counter = 0;
      
      try {
        // 读取流式响应
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          
          // 解析并发送数据
          const text = new TextDecoder().decode(value);
          const formattedData = `id:${++counter}\nevent:result\n:HTTP_STATUS/200\ndata:${text}\n\n`;
          res.write(formattedData);
        }
        
        res.end();
      } catch (error) {
        console.error('读取流式响应时出错:', error);
        // 即使出错，也尝试结束响应
        try {
          res.write(`id:${++counter}\nevent:error\n:HTTP_STATUS/500\ndata:{"error":"读取流式响应失败"}\n\n`);
          res.end();
        } catch (e) {
          console.error('结束响应时出错:', e);
        }
      }
    } else {
      // 如果不支持流式响应，则返回完整响应
      try {
        const data = await response.json();
        const output = data.output?.text || '抱歉，无法处理您的请求';
        return res.status(200).send(output);
      } catch (error) {
        console.error('解析响应失败:', error);
        return res.status(500).json({ error: 'Failed to parse API response' });
      }
    }
  } catch (error) {
    console.error('处理请求时出错:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 