/**
 * 聊天API封装函数
 */

// 最大重试次数
const MAX_RETRIES = 3;
// 重试延迟（毫秒）
const RETRY_DELAY = 1000;

/**
 * 等待指定时间
 * @param ms 毫秒数
 */
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 获取当前网站基础URL
 * 用于解决在不同环境下的路径问题
 */
const getBaseUrl = () => {
  const isLocal = window.location.hostname === 'localhost' || 
                  window.location.hostname.includes('stackblitz') || 
                  window.location.hostname.includes('webcontainer');
                  
  // 如果是本地开发、Stackblitz或WebContainer环境,
  // 使用相对路径，否则使用绝对路径
  return isLocal ? '' : window.location.origin;
};

/**
 * 向阿里云大模型发送聊天请求
 * @param message 用户消息
 * @param appId 应用ID
 * @param apiKey API密钥
 * @returns 返回AI的回复或事件源对象用于流式处理
 */
export const sendChatRequest = async (message: string, appId: string, apiKey: string, onStreamMessage?: (text: string) => void) => {
  let lastError: Error | null = null;
  
  // 获取API路径
  const baseUrl = getBaseUrl();
  const apiUrl = `${baseUrl}/api/chat`;
  
  console.log(`正在使用API路径: ${apiUrl}`);
  
  // 使用内置的简单AI回复作为备选方案
  const fallbackResponses = [
    '我现在无法连接到服务器，但我会尽力帮助您。您的问题是关于什么的？',
    '网络连接存在问题，我无法访问完整功能。请检查您的网络设置或稍后再试。',
    '抱歉，我暂时无法连接到后端服务。这可能是临时问题，请稍后再试。',
    '由于技术原因，我当前只能提供有限的回复。请尝试刷新页面或稍后再试。'
  ];
  
  // 重试逻辑
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`尝试重新连接 (${attempt}/${MAX_RETRIES})...`);
        // 重试前等待
        await wait(RETRY_DELAY * attempt);
      }
      
      console.log(`发送聊天请求到: ${apiUrl}`);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: message,
          appId,
          apiKey,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`请求失败 [${response.status}]: ${errorText}`);
        throw new Error(`网络请求失败: ${response.status} ${response.statusText}, ${errorText}`);
      }

      // 检查响应类型是否为事件流
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('text/event-stream') && onStreamMessage) {
        // 处理流式响应
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法读取流式响应');
        }

        // 创建TextDecoder用于解码响应
        const decoder = new TextDecoder();
        let buffer = '';
        
        // 读取流式数据并进行处理
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          
          // 解码文本
          buffer += decoder.decode(value, { stream: true });
          
          // 处理事件数据
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            // 提取data部分
            const match = line.match(/data:(.*)/);
            if (match && match[1]) {
              try {
                const jsonData = JSON.parse(match[1]);
                const text = jsonData.output?.text || '';
                if (text) {
                  onStreamMessage(text);
                }
              } catch (e) {
                console.error('解析流式数据失败:', e);
              }
            }
          }
        }
        
        return ''; // 流式处理完成
      } else {
        // 处理普通响应
        const text = await response.text();
        return text;
      }
    } catch (error) {
      console.error(`发送聊天请求失败 (尝试 ${attempt+1}/${MAX_RETRIES}):`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 如果是最后一次尝试，则抛出错误
      if (attempt === MAX_RETRIES - 1) {
        // 检查是否在WebContainer环境中，如果是，使用备选响应
        if (window.location.hostname.includes('webcontainer') || 
            window.location.hostname.includes('stackblitz')) {
          console.log('在开发环境中检测到API错误，使用备选响应');
          
          // 如果提供了流式回调，调用它
          if (onStreamMessage) {
            const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
            onStreamMessage(fallbackResponses[randomIndex]);
            return '';
          }
          
          // 否则返回备选响应
          const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
          return fallbackResponses[randomIndex];
        }
        
        throw new Error(`聊天请求失败，已重试${MAX_RETRIES}次: ${lastError.message}`);
      }
    }
  }
  
  // 这行代码永远不会执行，但TypeScript需要它
  throw lastError;
}; 