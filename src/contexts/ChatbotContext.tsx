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

    // 检查是否已经加载过脚本
    const scriptLoaded = document.querySelector('#web-chatbot-ui-script');
    console.log("聊天机器人脚本状态:", scriptLoaded ? "已加载" : "未加载");
    
    // 检查AI助手UI是否可见
    const uiVisible = document.querySelector('.webchat-container') || document.querySelector('.webchat-bubble-tip');
    console.log("AI助手UI状态:", uiVisible ? "可见" : "不可见");
    
    // 如果脚本已加载但UI不可见，尝试重新显示
    if (scriptLoaded) {
      if (!uiVisible) {
        console.log("AI助手UI不存在，尝试重新配置和显示");
        
        // 如果配置存在，确保正确配置以显示气泡而非完整窗口
        if ((window as any).CHATBOT_CONFIG) {
          console.log("重置聊天机器人配置为气泡状态");
          (window as any).CHATBOT_CONFIG = {
            ...(window as any).CHATBOT_CONFIG,
            displayByDefault: false,  // 不默认展开对话窗口
            draggable: true,          // 确保可拖动
            initialMode: 'BUBBLE'     // 确保初始模式为气泡
          };
          
          // 如果有displayOptions，也设置为气泡模式
          if ((window as any).CHATBOT_CONFIG.aiChatOptions && 
              (window as any).CHATBOT_CONFIG.aiChatOptions.displayOptions) {
            (window as any).CHATBOT_CONFIG.aiChatOptions.displayOptions.defaultMode = 'CHAT_BUBBLE';
          }
          
          // 重新初始化聊天机器人以气泡形式显示
          if ((window as any).initWebchat) {
            console.log("强制重新初始化聊天机器人为气泡模式");
            (window as any).initWebchat();
          }
        }
      } else {
        console.log("AI助手UI已存在且可见");
        
        // 确保气泡可拖动
        const bubble = document.querySelector('.webchat-bubble-tip');
        if (bubble) {
          // 添加可拖动脚本
          makeDraggable(bubble as HTMLElement);
        }
      }
      
      // 不再提前返回，允许后续代码重新加载聊天机器人
    }

    // 如果脚本尚未加载，或者需要强制重新加载
    if (!scriptLoaded) {
      console.log("开始加载聊天机器人");
      
      // 添加样式
      const link = document.createElement('link');
      link.id = 'web-chatbot-ui-style';
      link.rel = 'stylesheet';
      link.crossOrigin = 'anonymous';
      link.href = 'https://g.alicdn.com/aliyun-documentation/web-chatbot-ui/0.0.24/index.css';
      link.onerror = () => {
        console.error('Failed to load chatbot styles');
      };
      document.head.appendChild(link);

      // 添加脚本
      const script = document.createElement('script');
      script.id = 'web-chatbot-ui-script';
      script.type = 'module';
      script.crossOrigin = 'anonymous';
      script.src = 'https://g.alicdn.com/aliyun-documentation/web-chatbot-ui/0.0.24/index.js';
      
      script.onload = () => {
        console.log("聊天机器人脚本加载成功");
        if (!(window as any).CHATBOT_CONFIG) {
          console.log("设置聊天机器人配置");
          (window as any).CHATBOT_CONFIG = {
            endpoint: "/api/chat",  // 修改为使用本地API路由
            displayByDefault: false,  // 改为false，不默认展开对话窗口
            title: 'AI 助手',
            draggable: true,         // 确保可拖动
            aiChatOptions: {
              conversationOptions: {
                conversationStarters: conversationStarters || [
                  {prompt: '我想找一个快捷截图的软件？'},
                  {prompt: '我想找几个学编程的网站？'},
                  {prompt: '给我推荐几个免费下载游戏的网站?'},
                ]
              },
              displayOptions: {
                height: 600,
                width: 400,
                defaultMode: 'CHAT_BUBBLE'  // 确保默认为气泡模式
              },
              personaOptions: {
                assistant: {
                  name: '你好，我是你的 AI 助手',
                  avatar: 'https://img.alicdn.com/imgextra/i2/O1CN01Pda9nq1YDV0mnZ31H_!!6000000003025-54-tps-120-120.apng',
                  tagline: '您可以尝试点击下方的快捷入口开启体验！',
                }
              },
              messageOptions: {
                waitTimeBeforeStreamCompletion: 'never'
              }
            },
            dataProcessor: {
              rewritePrompt(prompt: string) {
                return prompt;
              }
            },
            initialMode: 'BUBBLE'  // 确保初始模式为气泡
          };
          
          // 在脚本加载后添加自定义拖拽逻辑和样式
          setTimeout(() => {
            const bubble = document.querySelector('.webchat-bubble-tip');
            if (bubble) {
              makeDraggable(bubble as HTMLElement);
            }
            
            // 启动iframe样式应用器
            const styleApplierInterval = startIframeStyleApplier();
            
            // 在主窗口加载后再次尝试应用样式
            setTimeout(() => {
              applyStylesToIframe();
            }, 3000);
          }, 1000);
        } else {
          // 如果配置已存在，确保displayByDefault设置为false以保持气泡模式
          (window as any).CHATBOT_CONFIG.displayByDefault = false;
          (window as any).CHATBOT_CONFIG.draggable = true;
          (window as any).CHATBOT_CONFIG.initialMode = 'BUBBLE';
          if ((window as any).CHATBOT_CONFIG.aiChatOptions && 
              (window as any).CHATBOT_CONFIG.aiChatOptions.displayOptions) {
            (window as any).CHATBOT_CONFIG.aiChatOptions.displayOptions.defaultMode = 'CHAT_BUBBLE';
          }
          
          // 也在这种情况下启动iframe样式应用器
          setTimeout(() => {
            const styleApplierInterval = startIframeStyleApplier();
          }, 1000);
        }
      };

      script.onerror = () => {
        console.error('Failed to load chatbot script');
      };

      document.body.appendChild(script);

      // 添加自定义样式
      const style = document.createElement('style');
      style.id = 'web-chatbot-custom-style';
      style.innerHTML = `
        :root {
          --webchat-toolbar-background-color: #1464E4;
          --webchat-toolbar-text-color: #FFF;
        }
        
        /* 响应式布局样式 */
        @media (max-width: 768px) {
          /* 小屏设备上的主容器 */
          .webchat-container {
            width: 90% !important;
            max-width: 350px !important;
            bottom: 90px !important;
            right: 8% !important;
            left: auto !important;
            height: 60vh !important;
            max-height: 500px !important;
          }
          
          /* 小屏设备上的气泡图标 */
          .webchat-bubble-tip {
            bottom: 40px !important;
            right: 20px !important;
            width: 50px !important;
            height: 50px !important;
          }
          
          /* 小屏设备上的聊天消息 */
          .webchat-message-bubble,
          .message-bubble,
          div[class^="message_"],
          div[class*=" message_"] {
            max-width: 90% !important;
            padding: 10px 14px !important;
          }
        }
        
        /* 手机设备样式 */
        @media (max-width: 480px) {
          .webchat-container {
            width: 95% !important;
            height: 75vh !important;
            bottom: 80px !important;
            right: 2.5% !important;
          }
          
          .webchat-toolbar {
            padding: 10px 12px !important;
          }
          
          .webchat-input-container {
            padding: 10px !important;
          }
          
          .webchat-message-container {
            padding: 12px !important;
          }
        }
        
        /* 聊天消息气泡专用样式 - 确保被正确应用 */
        /* 通用消息气泡样式 */
        .webchat-message-bubble,
        .message-bubble,
        div[class^="message_"],
        div[class*=" message_"],
        div[class^="MessageBubble_"],
        div[class*=" MessageBubble_"],
        div[data-testid="message-bubble"],
        .webchat-container .message,
        .webchat-message-container > div > div {
          border-radius: 18px !important;
          padding: 12px 16px !important;
          margin: 8px 0 !important;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05) !important;
          max-width: 85% !important;
          word-break: break-word !important;
        }
        
        /* 用户消息气泡 */
        .webchat-message-bubble.user-message,
        .user-message,
        div[class^="message_"][data-user="true"],
        div[class*=" message_"][data-user="true"],
        div[class^="MessageBubble_"][data-is-user="true"],
        div[class*=" MessageBubble_"][data-is-user="true"],
        div[data-testid="user-message"],
        div[data-sender="user"],
        .webchat-message-container > div > div:nth-child(2n) {
          background-color: #e1f2ff !important;
          border-bottom-right-radius: 8px !important;
          color: #333 !important;
          margin-left: auto !important;
          margin-right: 8px !important;
        }
        
        /* AI助手消息气泡 */
        .webchat-message-bubble.assistant-message,
        .assistant-message,
        div[class^="message_"]:not([data-user="true"]),
        div[class*=" message_"]:not([data-user="true"]),
        div[class^="MessageBubble_"]:not([data-is-user="true"]),
        div[class*=" MessageBubble_"]:not([data-is-user="true"]),
        div[data-testid="assistant-message"],
        div[data-sender="assistant"],
        .webchat-message-container > div > div:nth-child(2n-1) {
          background-color: #f0f0f0 !important;
          border-bottom-left-radius: 8px !important;
          color: #333 !important;
          margin-right: auto !important;
          margin-left: 8px !important;
        }
        
        /* 聊天消息文本 */
        .webchat-message-bubble p,
        .message-bubble p,
        div[class^="message_"] p,
        div[class*=" message_"] p,
        div[class^="MessageBubble_"] p,
        div[class*=" MessageBubble_"] p,
        div[data-testid="message-bubble"] p,
        .webchat-container .message p,
        .webchat-message-container > div > div p {
          margin: 0 !important;
          padding: 0 !important;
          line-height: 1.5 !important;
        }
        
        /* 注入一段JavaScript确保样式被应用 */
        .webchat-iframe-container::after {
          content: "";
          display: none;
        }

        /* 其他样式保持不变 */
        .webchat-container {
          z-index: 9999 !important;
          bottom: 80px !important;
          right: 20px !important;
          border-radius: 24px !important;
          overflow: hidden !important;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2) !important;
          border: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  };

  // 自定义拖拽函数
  const makeDraggable = (element: HTMLElement) => {
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    let isDragging = false;

    const dragStart = (e: MouseEvent | TouchEvent) => {
      isDragging = true;

      // 修正：第一次拖动时将视觉位置转为 left/top
      if (!element.style.left || !element.style.top) {
        const rect = element.getBoundingClientRect();
        element.style.left = rect.left + 'px';
        element.style.top = rect.top + 'px';
        element.style.right = 'auto';
        element.style.bottom = 'auto';
        element.style.position = 'fixed';
      }

      if (e.type === 'touchstart') {
        const touch = (e as TouchEvent).touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
      } else {
        const mouse = e as MouseEvent;
        startX = mouse.clientX;
        startY = mouse.clientY;
      }
      initialLeft = element.offsetLeft;
      initialTop = element.offsetTop;

      if (e.type === 'touchstart') {
        document.addEventListener('touchmove', elementDrag, { passive: false });
        document.addEventListener('touchend', dragEnd, { passive: false });
      } else {
        document.addEventListener('mousemove', elementDrag);
        document.addEventListener('mouseup', dragEnd);
      }
    };

    const elementDrag = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();

      let clientX, clientY;
      if (e.type === 'touchmove') {
        const touch = (e as TouchEvent).touches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        const mouse = e as MouseEvent;
        clientX = mouse.clientX;
        clientY = mouse.clientY;
      }

      let newLeft = initialLeft + (clientX - startX);
      let newTop = initialTop + (clientY - startY);

      // 边界检查
      const rect = element.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      if (newLeft < 0) newLeft = 0;
      if (newTop < 0) newTop = 0;
      if (newLeft + rect.width > vw) newLeft = vw - rect.width;
      if (newTop + rect.height > vh) newTop = vh - rect.height;

      element.style.left = newLeft + "px";
      element.style.top = newTop + "px";
    };

    const dragEnd = () => {
      isDragging = false;
      document.removeEventListener('mousemove', elementDrag);
      document.removeEventListener('mouseup', dragEnd);
      document.removeEventListener('touchmove', elementDrag);
      document.removeEventListener('touchend', dragEnd);
    };

    element.onmousedown = dragStart;
    element.addEventListener('touchstart', dragStart, { passive: false });

    console.log("已为AI助手添加鼠标和触摸拖拽功能");
  };

  // 应用样式到iframe内部的函数
  const applyStylesToIframe = () => {
    console.log("尝试向iframe内部应用消息气泡样式");
    
    // 查找所有可能的iframe
    const iframes = document.querySelectorAll('iframe');
    
    iframes.forEach(iframe => {
      try {
        // 等待iframe加载完成
        if (iframe.contentDocument) {
          const iframeDocument = iframe.contentDocument;
          
          // 创建样式元素
          const style = document.createElement('style');
          style.textContent = `
            /* 聊天气泡样式 - iframe内部版本 */
            .message, 
            .message-bubble, 
            [class*="message-"],
            [class*="MessageBubble"],
            .messages-container > div > div {
              border-radius: 18px !important;
              padding: 12px 16px !important;
              margin: 8px 0 !important;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05) !important;
              max-width: 85% !important;
            }
            
            /* 用户消息 */
            .user-message,
            [class*="user-message"],
            [data-sender="user"],
            .messages-container > div > div:nth-child(2n) {
              background-color: #e1f2ff !important;
              border-bottom-right-radius: 8px !important;
              color: #333 !important;
              margin-left: auto !important;
              margin-right: 8px !important;
            }
            
            /* AI助手消息 */
            .assistant-message,
            [class*="assistant-message"],
            [data-sender="assistant"],
            .messages-container > div > div:nth-child(2n-1) {
              background-color: #f0f0f0 !important;
              border-bottom-left-radius: 8px !important;
              color: #333 !important;
              margin-right: auto !important;
              margin-left: 8px !important;
            }

            /* iframe内部的响应式样式 */
            @media (max-width: 768px) {
              /* 小屏设备的消息样式 */
              .message, 
              .message-bubble, 
              [class*="message-"],
              [class*="MessageBubble"],
              .messages-container > div > div {
                max-width: 90% !important;
                padding: 10px 14px !important;
                font-size: 14px !important;
              }
              
              /* 消息容器 */
              .messages-container, 
              .webchat-message-container,
              [class*="messages-container"] {
                padding: 10px !important;
              }
              
              /* 输入框 */
              textarea, 
              input[type="text"], 
              .input-area {
                font-size: 14px !important;
                padding: 8px 10px !important;
              }
            }
            
            /* 特小屏幕设备 */
            @media (max-width: 480px) {
              /* 额外缩小边距和字体 */
              .message, 
              .message-bubble, 
              [class*="message-"],
              [class*="MessageBubble"] {
                padding: 8px 12px !important;
                margin: 6px 0 !important;
                font-size: 13px !important;
              }
              
              /* 消息容器 */
              .messages-container, 
              .webchat-message-container,
              [class*="messages-container"] {
                padding: 8px !important;
              }
            }
          `;
          
          // 添加样式到iframe文档
          iframeDocument.head.appendChild(style);
          console.log("成功向iframe内部应用样式");
        }
      } catch (error) {
        console.error("无法向iframe内部应用样式:", error);
      }
    });
  };

  // 定期尝试应用样式
  const startIframeStyleApplier = () => {
    // 立即尝试一次
    applyStylesToIframe();
    
    // 设置周期性尝试
    const interval = setInterval(() => {
      applyStylesToIframe();
    }, 2000); // 每2秒尝试一次
    
    // 30秒后停止尝试
    setTimeout(() => {
      clearInterval(interval);
    }, 30000);
    
    return interval;
  };

  const unloadChatbot = () => {
    console.log("卸载聊天机器人");
    // 如果存在聊天机器人实例，移除它
    const chatbotContainer = document.querySelector('.webchat-container');
    const chatbotBubble = document.querySelector('.webchat-bubble-tip');
    if (chatbotContainer) {
      console.log("移除聊天机器人容器");
      chatbotContainer.remove();
    }
    if (chatbotBubble) {
      console.log("移除聊天机器人气泡");
      chatbotBubble.remove();
    }

    // 修改配置以禁用显示
    if ((window as any).CHATBOT_CONFIG) {
      console.log("设置聊天机器人配置为不显示");
      (window as any).CHATBOT_CONFIG.displayByDefault = false;
    }

    // 不完全移除脚本和样式，只是禁用显示
    // 这样在路由切换时可以快速重新启用
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