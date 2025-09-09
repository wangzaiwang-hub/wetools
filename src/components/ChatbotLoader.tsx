import React, { useEffect, useRef } from 'react';
import { useChatbot } from '../contexts/ChatbotContext';
import { useLocation } from 'react-router-dom';

interface ChatbotLoaderProps {
  conversationStarters?: {prompt: string}[];
}

const ChatbotLoader: React.FC<ChatbotLoaderProps> = ({ 
  conversationStarters = [
    {prompt: '我想找一个快捷截图的软件？'},
    {prompt: '我想找几个学编程的网站？'},
    {prompt: '给我推荐几个免费下载游戏的网站?'},
  ] 
}) => {
  const { isChatbotEnabled, loadChatbot, unloadChatbot } = useChatbot();
  const loadAttempts = useRef(0);
  const maxAttempts = 3;
  const location = useLocation();
  
  // 记录组件加载
  useEffect(() => {
    console.log('ChatbotLoader 组件已加载, 路径:', location.pathname, 'isChatbotEnabled:', isChatbotEnabled);
    
    // 组件加载时立即尝试加载聊天机器人
    if (isChatbotEnabled) {
      console.log('ChatbotLoader 初始化 - 立即尝试加载聊天机器人');
      loadChatbot(conversationStarters);
    }
    
    // 组件卸载时的清理
    return () => {
      console.log('ChatbotLoader 组件已卸载');
    };
  }, []);

  // 响应路径变化
  useEffect(() => {
    console.log('ChatbotLoader 检测到路径变化:', location.pathname, 'isChatbotEnabled:', isChatbotEnabled);
    
    // 如果是在允许显示聊天机器人的页面，立即尝试加载
    if (isChatbotEnabled) {
      console.log('ChatbotLoader 路径变化 - 尝试加载聊天机器人');
      loadChatbot(conversationStarters);
    }
  }, [location.pathname]);
  
  // 响应isChatbotEnabled状态变化
  useEffect(() => {
    console.log('ChatbotLoader isChatbotEnabled变化:', isChatbotEnabled);
    loadAttempts.current = 0; // 重置尝试次数
    
    if (isChatbotEnabled) {
      console.log('ChatbotLoader 状态变化 - 聊天机器人已启用，尝试加载');
      
      // 立即尝试一次
      loadChatbot(conversationStarters);
      
      // 设置定时器进行多次尝试
      const interval = setInterval(() => {
        if (loadAttempts.current < maxAttempts) {
          loadAttempts.current += 1;
          console.log('ChatbotLoader 第', loadAttempts.current, '次尝试加载聊天机器人');
          
          // 检查Appflow Chatbot是否已初始化
          if (!(window as any).APPFLOW_CHAT_SDK || !(window as any).APPFLOW_CHAT_SDK.isInitialized) {
            loadChatbot(conversationStarters);
          } else {
            console.log('ChatbotLoader Appflow Chatbot已初始化，停止尝试');
            clearInterval(interval);
          }
        } else {
          console.log('ChatbotLoader 达到最大尝试次数，停止尝试');
          clearInterval(interval);
        }
      }, 1500);
      
      return () => {
        clearInterval(interval);
      };
    } else {
      console.log('ChatbotLoader 状态变化 - 聊天机器人已禁用');
    }
  }, [isChatbotEnabled, conversationStarters, loadChatbot]);

  // 这个组件不渲染任何可见内容
  return null;
};

export default ChatbotLoader;