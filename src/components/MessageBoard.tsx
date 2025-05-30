import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MessageCircle, X, Send, Reply, ChevronDown, ChevronUp, Trash2, Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Cache } from '../utils/cache';

interface Message {
  id: string;
  user_id: string;
  text: string;
  reply_to_id?: string;
  created_at: string;
  is_deleted: boolean;
  user: {
    nickname: string;
    avatar_url: string;
    is_admin: boolean;
    is_muted: boolean;
    muted_until: string | null;
  };
  user_profiles?: {
    nickname: string;
    avatar_url: string;
    is_admin: boolean;
    is_muted: boolean;
    muted_until: string | null;
  };
}

interface ReplyCollapseState {
  [key: string]: boolean;
}

const MessageBoard = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<ReplyCollapseState>({});
  const [loadedReplies, setLoadedReplies] = useState<ReplyCollapseState>({});
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const refreshIntervalRef = useRef<any>(null);

  // 平滑滚动到底部
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 加载消息
  const loadMessages = async () => {
    try {
      setIsLoading(true);
      
      // 首先尝试从缓存中获取消息
      const cachedMessages = Cache.get<Message[]>('messages');
      if (cachedMessages) {
        setMessages(cachedMessages);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          user_id,
          text,
          reply_to_id,
          created_at,
          is_deleted,
          user_profiles!user_id (
            nickname,
            avatar_url,
            is_admin,
            is_muted,
            muted_until
          )
        `)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        toast.error('加载消息失败');
        return;
      }
      
      if (!data) {
        setMessages([]);
        return;
      }

      // 转换数据结构以匹配 Message 接口
      const formattedMessages = data.map(msg => ({
        ...msg,
        user: msg.user_profiles || {
          nickname: '未知用户',
          avatar_url: '/default-avatar.jpg',
          is_admin: false,
          is_muted: false,
          muted_until: null
        }
      }));
      
      setMessages(formattedMessages);
      
      // 将消息保存到缓存中，设置过期时间为5分钟
      Cache.set('messages', formattedMessages, { expireTime: 5 * 60 * 1000 });
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error loading messages:', error);
        toast.error('加载消息失败');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 静默刷新消息
  const silentRefresh = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          user_id,
          text,
          reply_to_id,
          created_at,
          is_deleted,
          user_profiles!user_id (
            nickname,
            avatar_url,
            is_admin,
            is_muted,
            muted_until
          )
        `)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('静默刷新消息失败:', error);
        return;
      }
      
      if (!data) return;

      // 转换数据结构
      const formattedMessages = data.map(msg => ({
        ...msg,
        user: msg.user_profiles || {
          nickname: '未知用户',
          avatar_url: '/default-avatar.jpg',
          is_admin: false,
          is_muted: false,
          muted_until: null
        }
      }));
      
      // 比较新旧消息，判断是否需要滚动
      const shouldScroll = 
        messages.length !== formattedMessages.length || 
        JSON.stringify(messages[messages.length - 1]?.id) !== 
        JSON.stringify(formattedMessages[formattedMessages.length - 1]?.id);
      
      setMessages(formattedMessages);
      
      // 更新缓存
      Cache.set('messages', formattedMessages, { expireTime: 5 * 60 * 1000 });
      
      if (shouldScroll) {
        scrollToBottom();
      }
    } catch (error) {
      console.error('静默刷新失败:', error);
    }
  };

  // 设置定时刷新
  useEffect(() => {
    if (isExpanded) {
      // 初始加载
      loadMessages();
      
      // 设置定时器，每秒刷新一次
      refreshIntervalRef.current = setInterval(() => {
        silentRefresh();
      }, 1000);
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isExpanded]);

  // 检查当前用户是否是管理员
  useEffect(() => {
    const checkAdminStatus = () => {
      if (user?.email === 'wangzaiwang@wetools.com') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user?.email]);

  // 添加消息列表的样式
  const messageListStyle = {
    transition: 'all 0.3s ease-in-out',
    opacity: isLoading ? 0.5 : 1
  };

  // 单个消息的样式
  const messageStyle = {
    animation: 'fadeIn 0.3s ease-in-out',
    transition: 'all 0.3s ease-in-out'
  };

  const handleSendMessage = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    if (!newMessage.trim()) {
      toast.error('消息内容不能为空');
      return;
    }

    try {
      // 检查用户是否被禁言
      let { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          is_muted,
          muted_until,
          nickname,
          avatar_url,
          is_admin
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!userProfile) {
        // 如果用户配置不存在，则创建一个新的
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            nickname: user.user_metadata?.nickname || `用户${user.id.substring(0, 8)}`,
            avatar_url: user.user_metadata?.avatar_url || '/default-avatar.jpg',
            is_admin: false,
            is_muted: false,
            muted_until: null
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating user profile:', createError);
          if (createError.code === '23505') { // 唯一约束冲突
            // 重试获取用户配置
            const { data: retryProfile, error: retryError } = await supabase
              .from('user_profiles')
              .select('is_muted, muted_until, nickname, avatar_url, is_admin')
              .eq('user_id', user.id)
              .single();

            if (retryError) {
              toast.error('无法创建或获取用户配置，请刷新页面重试');
              return;
            }
            userProfile = retryProfile;
          } else {
            toast.error('创建用户配置失败，请刷新页面重试');
            return;
          }
        } else {
          userProfile = newProfile;
        }
      }

      if (userProfile.is_muted) {
        const mutedUntil = userProfile.muted_until;
        if (!mutedUntil || new Date(mutedUntil) > new Date()) {
          toast.error('您已被禁言，无法发送消息');
          return;
        }
      }

      const messageData = {
        user_id: user.id,
        text: newMessage.trim(),
        reply_to_id: replyTo?.id
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          id,
          user_id,
          text,
          reply_to_id,
          created_at,
          is_deleted,
          user_profiles!user_id (
            nickname,
            avatar_url,
            is_admin,
            is_muted,
            muted_until
          )
        `)
        .single();

      if (error) {
        console.error('Error sending message:', error);
        if (error.code === '42501') {
          toast.error('没有发送消息的权限');
        } else if (error.code === '23503') {
          toast.error('用户信息不存在');
        } else {
          toast.error('发送失败，请稍后重试');
        }
        return;
      }

      if (data) {
        // 立即添加新消息到列表
        const formattedMessage = {
          ...data,
          user: data.user_profiles
        };
        setMessages(prev => [...prev, formattedMessage]);
        scrollToBottom();
      }

      setNewMessage('');
      setReplyTo(null);
      toast.success('发送成功');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('发送失败，请稍后重试');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMouseLeave = () => {
    setIsExpanded(false);
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  const toggleReplies = (messageId: string) => {
    setExpandedReplies(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
    if (!expandedReplies[messageId] && !loadedReplies[messageId]) {
      setLoadedReplies(prev => ({
        ...prev,
        [messageId]: true
      }));
    }
  };

  const getReplies = (messageId: string) => {
    const allReplies = messages.filter(m => m.reply_to_id === messageId);
    if (!expandedReplies[messageId]) {
      return allReplies.slice(0, 10);
    }
    return loadedReplies[messageId] ? allReplies : allReplies.slice(0, 10);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      if (!user) {
        toast.error('请先登录');
        return;
      }

      console.log('开始删除消息:', messageId);
      console.log('当前用户:', user);
      console.log('管理员状态:', isAdmin);

      // 首先确认消息存在
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (messageError) {
        console.error('获取消息失败:', messageError);
        toast.error('无法获取消息信息');
        return;
      }

      if (!message) {
        console.error('消息不存在:', messageId);
        toast.error('消息不存在');
        return;
      }

      console.log('要删除的消息:', message);

      let deleteError;

      // 根据用户角色使用不同的删除方法
      if (isAdmin && message.user_id !== user.id) {
        // 管理员删除其他用户的消息
        const { error } = await supabase.rpc('admin_delete_message', {
          message_id: messageId,
          admin_email: user.email
        });
        deleteError = error;
      } else {
        // 用户删除自己的消息
        const { error } = await supabase
          .from('messages')
          .delete()
          .eq('id', messageId)
          .eq('user_id', user.id);
        deleteError = error;
      }

      if (deleteError) {
        console.error('删除消息失败:', deleteError);
        toast.error(deleteError.message || '删除失败');
        return;
      }

      // 从本地状态中移除消息
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== messageId)
      );
      
      console.log('消息删除成功:', messageId);
      toast.success('消息已删除');

    } catch (error) {
      console.error('删除消息时发生错误:', error);
      toast.error('删除失败，请稍后重试');
    }
  };

  const handleMuteUser = async (userId: string, duration?: string) => {
    try {
      const { error } = await supabase.rpc('mute_user', {
        target_user_id: userId,
        mute_duration: duration
      });

      if (error) throw error;
      toast.success('用户已被禁言');
    } catch (error) {
      console.error('Error muting user:', error);
      toast.error('禁言失败');
    }
  };

  const handleMuteClick = (userId: string) => {
    if (!isAdmin) {
      toast.error('只有管理员才能禁言用户');
      return;
    }

    const options = [
      { label: '1小时', value: '1 hours' },
      { label: '12小时', value: '12 hours' },
      { label: '1天', value: '24 hours' },
      { label: '7天', value: '168 hours' },
      { label: '30天', value: '720 hours' },
      { label: '永久', value: null }
    ];

    const optionsText = options.map((opt, index) => 
      `${index + 1}. ${opt.label}`
    ).join('\n');

    const choice = window.prompt(
      `请选择禁言时长：\n${optionsText}\n\n请输入数字(1-${options.length})：`
    );

    if (choice === null) return;

    const selectedOption = options[parseInt(choice) - 1];
    if (!selectedOption) {
      toast.error('无效的选择');
      return;
    }

    handleMuteUser(userId, selectedOption.value);
  };

  const renderMessage = (msg: Message, level: number = 0) => {
    // 判断是否是自己发送的消息
    const isOwnMessage = user?.id === msg.user_id;
    
    return (
      <div key={msg.id} className={`mb-4 last:mb-0 w-full`}>
        <div 
          className={`flex items-start gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`} 
        >
          <div className={`flex-shrink-0 ${isOwnMessage ? 'pr-2' : 'pl-2'}`}>
            <img
              src={msg.user.avatar_url || '/default/avatar.jpg'}
              alt="avatar"
              className="w-8 h-8 rounded-full cursor-pointer"
              onClick={() => isAdmin && handleMuteClick(msg.user_id)}
              title={isAdmin ? "点击设置禁言" : undefined}
            />
          </div>
          <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} min-w-0`} style={{ maxWidth: '70%' }}>
            <div className={`flex items-center gap-1 mb-1 ${isOwnMessage ? 'justify-end' : 'justify-start'} w-full`}>
              <span className="text-sm font-medium text-gray-900">
                {msg.user.nickname}
                {msg.user.is_admin && (
                  <span className="ml-1 text-xs text-blue-500">(管理员)</span>
                )}
                {msg.user.is_muted && (
                  <span className="ml-1 text-xs text-red-500">(已禁言)</span>
                )}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(msg.created_at).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full">
              <div className="break-words min-w-0 flex-1">
                {msg.is_deleted ? (
                  <div className="text-sm text-gray-400 italic">此消息已被删除</div>
                ) : (
                  <div className={`rounded-lg px-4 py-2 ${
                    isOwnMessage 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}>
                    {msg.reply_to_id && (
                      <div className={`text-sm mb-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                        回复 @{messages.find(m => m.id === msg.reply_to_id)?.user.nickname}：
                      </div>
                    )}
                    <div className="text-sm break-all text-left">{msg.text}</div>
                  </div>
                )}
              </div>
              
              {!msg.is_deleted && (isOwnMessage || isAdmin) && (
                <button
                  onClick={() => handleDeleteMessage(msg.id)}
                  className="text-red-500 hover:text-red-600 flex-shrink-0"
                  title={isAdmin && !isOwnMessage ? "管理员删除" : "删除消息"}
                  aria-label={isAdmin && !isOwnMessage ? "管理员删除此消息" : "删除消息"}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            {!msg.user.is_muted && !msg.is_deleted && (
              <button
                onClick={() => handleReply(msg)}
                className={`text-xs mt-1 flex items-center ${
                  isOwnMessage ? 'text-gray-200 hover:text-white' : 'text-gray-500 hover:text-blue-500'
                }`}
                aria-label={`回复 ${msg.user.nickname} 的消息`}
              >
                <Reply size={14} className="mr-1" aria-hidden="true" />
                回复
              </button>
            )}
          </div>
        </div>
        
        {getReplies(msg.id).length > 0 && (
          <div className={`mt-2 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
            {getReplies(msg.id).map(reply => renderMessage(reply, level + 1))}
            {messages.filter(m => m.reply_to_id === msg.id).length > 10 && (
              <button
                onClick={() => toggleReplies(msg.id)}
                className={`text-xs text-blue-500 hover:text-blue-600 flex items-center mt-1 ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`}
              >
                {expandedReplies[msg.id] ? (
                  <>
                    <ChevronUp size={14} className="mr-1" />
                    收起回复
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} className="mr-1" />
                    查看更多回复
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-all duration-300 flex items-center justify-center"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isExpanded ? (
        <div className="bg-white rounded-lg shadow-lg w-96 max-h-[500px] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-lg font-semibold">留言板</h2>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4" style={messageListStyle}>
            {messages.filter(msg => !msg.reply_to_id).map(msg => (
              <div key={msg.id} style={messageStyle}>
                {renderMessage(msg)}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t">
            {replyTo && (
              <div className="mb-2 text-sm text-gray-500 flex items-center">
                <span>回复: {replyTo.text.substring(0, 20)}...</span>
                <button
                  onClick={cancelReply}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入留言..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                className="p-2 text-blue-500 hover:text-blue-600"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="打开消息板"
        >
          <MessageCircle size={24} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

// 添加全局样式
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .message-enter {
    opacity: 0;
    transform: translateY(10px);
  }

  .message-enter-active {
    opacity: 1;
    transform: translateY(0);
    transition: all 300ms ease-in-out;
  }

  .message-exit {
    opacity: 1;
  }

  .message-exit-active {
    opacity: 0;
    transform: translateY(-10px);
    transition: all 300ms ease-in-out;
  }
`;
document.head.appendChild(style);

export default MessageBoard; 