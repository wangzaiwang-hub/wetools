import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ChatbotContextType {
  isChatbotEnabled: boolean;
  enableChatbot: () => void;
  disableChatbot: () => void;
  loadChatbot: (conversationStarters?: Array<{prompt: string}>) => void;
  unloadChatbot: () => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

// 这些路径将启用AI助手
const CHATBOT_ENABLED_PATHS = ['/', '/websites', '/website-directory'];

export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [isChatbotEnabled, setIsChatbotEnabled] = useState<boolean>(false);
  const location = useLocation();

  // 路径变化时检查是否应该启用聊天机器人
  useEffect(() => {
    const currentPath = location.pathname;
    console.log("路径变化:", currentPath); 
    
    // 检查是否在启用聊天机器人的路径列表中
    const shouldEnableChatbot = CHATBOT_ENABLED_PATHS.includes(currentPath) || 
                               CHATBOT_ENABLED_PATHS.some(path => currentPath.startsWith(path));
    
    if (shouldEnableChatbot) {
      console.log("当前路径在允许显示AI助手的列表中，启用聊天机器人");
      setIsChatbotEnabled(true);
      
      // 在设置为启用后主动加载聊天机器人
      setTimeout(() => {
        console.log("路径匹配后主动加载聊天机器人");
        loadChatbot();
      }, 500);
    } else {
      console.log("当前路径不允许显示AI助手，禁用聊天机器人");
      // 如果当前已启用，则禁用并卸载
      if (isChatbotEnabled) {
        console.log("需要禁用当前启用的AI助手");
        setIsChatbotEnabled(false);
        unloadChatbot();
      }
    }
  }, [location.pathname]);

  // 当启用状态变化时触发加载或卸载
  useEffect(() => {
    console.log("聊天机器人启用状态变化:", isChatbotEnabled ? "启用" : "禁用");
    if (isChatbotEnabled) {
      loadChatbot();
    } else {
      unloadChatbot();
    }
  }, [isChatbotEnabled]);

  const enableChatbot = () => {
    console.log("调用启用聊天机器人方法");
    setIsChatbotEnabled(true);
  };

  const disableChatbot = () => {
    console.log("调用禁用聊天机器人方法");
    setIsChatbotEnabled(false);
  };

  const loadChatbot = (conversationStarters?: Array<{prompt: string}>) => {
    console.log("尝试加载聊天机器人, 启用状态:", isChatbotEnabled);
    
    // 如果未启用，不加载
    if (!isChatbotEnabled) {
      console.log("聊天机器人未启用，不加载");
      return;
    }

    // 检查是否已经初始化过Appflow Chatbot
    if ((window as any).APPFLOW_CHAT_SDK && (window as any).APPFLOW_CHAT_SDK.isInitialized) {
      console.log("Appflow Chatbot已经初始化");
      return;
    }

    // 初始化Appflow Chatbot
    if ((window as any).APPFLOW_CHAT_SDK) {
      try {
        (window as any).APPFLOW_CHAT_SDK.init({
          integrateConfig: {
            integrateId: 'cit-623ebc0d2f4b4279bf06',
            domain: {
              requestDomain: 'http://ai.wetools.wctw.fun'
            },
            draggable: true, // 是否可拖拽
          }
        });
        (window as any).APPFLOW_CHAT_SDK.isInitialized = true;
        console.log("Appflow Chatbot初始化成功");
      } catch (error) {
        console.error("Appflow Chatbot初始化失败:", error);
      }
    } else {
      console.log("Appflow Chatbot SDK尚未加载");
    }
  };

  const unloadChatbot = () => {
    console.log("卸载聊天机器人");
    // 对于Appflow Chatbot，我们不需要特别卸载，只需隐藏
    if ((window as any).APPFLOW_CHAT_SDK && (window as any).APPFLOW_CHAT_SDK.isInitialized) {
      console.log("Appflow Chatbot已初始化，无需特殊处理");
    }
  };

  return (
    <ChatbotContext.Provider value={{ 
      isChatbotEnabled, 
      enableChatbot, 
      disableChatbot, 
      loadChatbot, 
      unloadChatbot 
    }}>
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
} 