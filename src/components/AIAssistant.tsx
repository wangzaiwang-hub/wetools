import React, { useState, useEffect, useRef } from 'react';
import { X, Send, RefreshCw, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { sendChatRequest } from '../api/chatAPI';

interface Message {
  content: string;
  isUser: boolean;
  timestamp: Date;
  error?: boolean;
  retrying?: boolean;
  debug?: boolean;
}

interface AIAssistantProps {
  appId: string;
  apiKey: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ appId, apiKey }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connected');
  const [isDebugMode, setIsDebugMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 检查是否在开发环境中
  const isDevelopmentEnv = () => {
    return window.location.hostname === 'localhost' || 
           window.location.hostname.includes('stackblitz') || 
           window.location.hostname.includes('webcontainer');
  };

  // 初始欢迎消息
  useEffect(() => {
    setMessages([
      {
        content: '你好，我是AI助手，有什么可以帮助你的吗？',
        isUser: false,
        timestamp: new Date()
      }
    ]);

    // 如果是开发环境，显示额外提示
    if (isDevelopmentEnv()) {
      setMessages(prev => [...prev, {
        content: '提示：您正在开发环境中，某些API功能可能受限。错误时将使用模拟响应。',
        isUser: false,
        timestamp: new Date(),
        debug: true
      }]);
    }

    // 检查appId是否为有效值
    if (appId === 'xxx' || !appId) {
      setMessages(prev => [...prev, {
        content: '警告：未配置有效的appId。请在Home.tsx文件中设置正确的百炼API应用ID。',
        isUser: false,
        timestamp: new Date(),
        error: true
      }]);
    }
  }, [appId]);

  // 自动滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const toggleDebugMode = () => {
    setIsDebugMode(!isDebugMode);
    
    if (!isDebugMode) {
      // 切换到调试模式时，显示环境信息
      const envInfo = `调试信息:\n` + 
                      `- 环境: ${window.location.hostname}\n` +
                      `- API路径: ${window.location.origin}/api/chat\n` + 
                      `- AppID: ${appId || '未设置'}\n` +
                      `- API Key: ${apiKey ? '已设置' : '未设置'}\n` +
                      `- 开发模式: ${isDevelopmentEnv() ? '是' : '否'}`;
      
      setMessages(prev => [...prev, {
        content: envInfo,
        isUser: false,
        timestamp: new Date(),
        debug: true
      }]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // 重试最后一条消息
  const retryLastMessage = async () => {
    if (!lastUserMessage) return;
    
    // 将最后一条AI消息标记为正在重试
    setMessages(prev => {
      const updatedMessages = [...prev];
      // 查找最后一条非用户消息
      for (let i = updatedMessages.length - 1; i >= 0; i--) {
        if (!updatedMessages[i].isUser && !updatedMessages[i].debug) {
          updatedMessages[i] = { 
            ...updatedMessages[i],
            content: '正在重试...',
            retrying: true,
            error: false
          };
          break;
        }
      }
      return updatedMessages;
    });
    
    // 重新发送请求
    await sendMessage(lastUserMessage);
  };

  // 提取消息发送逻辑为单独函数，方便重用
  const sendMessage = async (message: string) => {
    setIsLoading(true);
    setConnectionStatus('connecting');

    try {
      // 为流式响应创建一个占位消息
      const emptyMessage: Message = {
        content: '',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => {
        // 如果是重试，则替换最后一条非调试的AI消息
        if (prev.length > 0) {
          const updatedMessages = [...prev];
          for (let i = updatedMessages.length - 1; i >= 0; i--) {
            if (!updatedMessages[i].isUser && updatedMessages[i].retrying) {
              updatedMessages[i] = emptyMessage;
              return updatedMessages;
            }
          }
        }
        return [...prev, emptyMessage];
      });
      
      const streamingId = messages.length; // 当前消息数组长度就是新消息的索引
      setStreamingMessageId(streamingId);

      // 使用封装的API函数，传入流式响应处理函数
      const onStreamMessage = (text: string) => {
        setConnectionStatus('connected');
        setMessages(prev => {
          const updatedMessages = [...prev];
          // 查找最后一条非用户消息
          for (let i = updatedMessages.length - 1; i >= 0; i--) {
            if (!updatedMessages[i].isUser && !updatedMessages[i].debug) {
              updatedMessages[i] = {
                ...updatedMessages[i],
                content: text,
                retrying: false
              };
              break;
            }
          }
          return updatedMessages;
        });
      };
      
      await sendChatRequest(message, appId, apiKey, onStreamMessage);
      setStreamingMessageId(null);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error fetching response:', error);
      setConnectionStatus('disconnected');
      
      // 添加错误消息
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const detailedError = errorMessage.includes('网络请求失败') 
        ? `网络连接问题，请检查您的网络设置。\n\n${isDebugMode ? errorMessage : ''}`
        : `抱歉，我遇到了一些技术问题，请稍后再试。\n\n${isDebugMode ? errorMessage : ''}`;
      
      setMessages(prev => {
        // 查找最后一条非用户消息
        const updatedMessages = [...prev];
        for (let i = updatedMessages.length - 1; i >= 0; i--) {
          if (!updatedMessages[i].isUser && !updatedMessages[i].debug) {
            updatedMessages[i] = {
              ...updatedMessages[i],
              content: detailedError,
              error: true,
              retrying: false
            };
            break;
          }
        }
        return updatedMessages;
      });
      
      setStreamingMessageId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === '') return;

    const userMessage: Message = {
      content: input,
      isUser: true,
      timestamp: new Date()
    };

    // 保存用户消息以便重试
    setLastUserMessage(input);
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    await sendMessage(input);
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取连接状态样式
  const getConnectionStatusStyles = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-red-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed bottom-24 right-8 z-[9999]">
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition-all duration-300"
          aria-label="打开AI助手"
        >
          <img src="/ai-assistant-icon.svg" alt="AI助手" width="24" height="24" className="text-white" />
        </button>
      )}

      {isOpen && (
        <div 
          ref={chatContainerRef}
          className="flex flex-col bg-white rounded-lg shadow-xl w-80 sm:w-96 h-[500px] overflow-hidden transition-all duration-300"
        >
          {/* 聊天头部 */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-500 text-white">
            <div className="flex items-center">
              <img src="/ai-assistant-icon.svg" alt="AI助手" width="20" height="20" className="mr-2" />
              <h3 className="font-medium">AI 助手</h3>
              <div className={clsx("ml-2 w-2 h-2 rounded-full", getConnectionStatusStyles())}></div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleDebugMode} 
                aria-label={isDebugMode ? "关闭调试模式" : "开启调试模式"}
                className="text-white hover:text-blue-100 transition-colors"
              >
                <Info size={18} className={isDebugMode ? "text-yellow-300" : ""} />
              </button>
              <button onClick={toggleChat} aria-label="关闭窗口">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* 聊天消息区域 */}
          <div className="flex-1 p-4 overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={clsx(
                  "max-w-[80%] mb-4 rounded-lg p-3",
                  message.isUser
                    ? "ml-auto bg-blue-500 text-white rounded-tr-none"
                    : message.error
                      ? "mr-auto bg-red-50 text-red-800 rounded-tl-none"
                      : message.debug
                        ? "mr-auto bg-yellow-50 text-gray-800 rounded-tl-none border border-yellow-200"
                        : "mr-auto bg-gray-100 text-gray-800 rounded-tl-none"
                )}
              >
                <div className="mb-1 whitespace-pre-line">
                  {message.content}
                  {message.error && !message.debug && (
                    <button 
                      onClick={retryLastMessage}
                      className="inline-flex items-center ml-2 text-red-700 hover:text-red-900"
                      disabled={isLoading}
                    >
                      <RefreshCw size={14} className="mr-1" /> 重试
                    </button>
                  )}
                </div>
                <div
                  className={clsx(
                    "text-xs",
                    message.isUser 
                      ? "text-blue-100" 
                      : message.error 
                        ? "text-red-500" 
                        : message.debug
                          ? "text-yellow-600"
                          : "text-gray-500"
                  )}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
            ))}
            {isLoading && streamingMessageId === null && (
              <div className="flex items-center space-x-2 text-gray-500 mr-auto bg-gray-100 rounded-lg rounded-tl-none p-3">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '600ms' }}></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex items-center">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="请输入您的问题..."
              className="flex-1 rounded-full py-2 px-4 focus:outline-none border border-gray-300 focus:border-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="ml-2 p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:bg-blue-300"
              disabled={isLoading || input.trim() === ''}
              aria-label="发送"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;