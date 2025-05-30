import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface StatusProps {
  show?: boolean;
  autoCheck?: boolean;
}

const SupabaseStatusChecker: React.FC<StatusProps> = ({ 
  show = false,  // 默认不显示错误提示
  autoCheck = true // 默认自动检查连接
}) => {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [buckets, setBuckets] = useState<any[]>([]);
  const [storageEnabled, setStorageEnabled] = useState<boolean>(false);
  const [dbEnabled, setDbEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [showDetailedInfo, setShowDetailedInfo] = useState<boolean>(false);

  useEffect(() => {
    // 只有在autoCheck为true时才自动检查
    if (autoCheck) {
      checkSupabaseConnection();
      
      // 自动每30秒重试一次
      const intervalId = setInterval(() => {
        if (status === 'error') {
          handleRetry();
        }
      }, 30000);
      
      return () => clearInterval(intervalId);
    }
  }, [autoCheck]);

  const checkSupabaseConnection = async () => {
    try {
      setLoading(true);
      
      // 检查数据库连接
      const { error: dbError } = await supabase
        .from('advertisements')
        .select('count')
        .limit(1);
      
      if (dbError) {
        console.error('数据库连接错误:', dbError);
        setDbEnabled(false);
      } else {
        setDbEnabled(true);
      }
      
      // 检查存储连接
      const { data: bucketsData, error: storageError } = await supabase
        .storage
        .listBuckets();
      
      if (storageError) {
        console.error('存储连接错误:', storageError);
        setStorageEnabled(false);
        setStatus('error');
        setErrorMessage(`Supabase存储服务错误: ${storageError.message}`);
      } else {
        setStorageEnabled(true);
        setBuckets(bucketsData || []);
        
        const softwareImagesBucket = bucketsData?.find(
          (bucket: any) => bucket.name === 'software-images'
        );
        
        if (!softwareImagesBucket) {
          setStatus('error');
          setErrorMessage('找不到存储桶 "software-images"。请确保已创建此存储桶。');
        } else {
          // 检查广告文件夹
          const { data: folderData, error: folderError } = await supabase
            .storage
            .from('software-images')
            .list('ads');
            
          if (folderError) {
            setStatus('error');
            setErrorMessage(`无法访问广告文件夹: ${folderError.message}`);
          } else {
            setStatus('connected');
          }
        }
      }
    } catch (error) {
      console.error('检查Supabase状态时出错:', error);
      setStatus('error');
      setErrorMessage(`连接错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    checkSupabaseConnection();
  };

  // 如果不应该显示或连接正常，则不渲染任何内容
  if (!show || status === 'connected') return null;
  
  if (status === 'error') {
    return (
      <>
        {/* 简洁的错误提示 */}
        <div className="fixed top-16 left-0 right-0 mx-auto z-50 flex justify-center pointer-events-none">
          <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-3 max-w-md pointer-events-auto flex items-center">
            <AlertTriangle className="text-red-500 mr-2 flex-shrink-0" size={20} />
            <p className="text-red-800 text-sm">
              数据连接异常，部分功能可能受限
            </p>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="ml-3 px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs rounded flex items-center"
            >
              {isRetrying ? (
                <RefreshCw className="animate-spin mr-1" size={12} />
              ) : (
                <RefreshCw className="mr-1" size={12} />
              )}
              {isRetrying ? '重试中...' : '重试连接'}
            </button>
            <button
              onClick={() => setShowDetailedInfo(!showDetailedInfo)}
              className="ml-2 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs rounded"
            >
              {showDetailedInfo ? '收起' : '详情'}
            </button>
          </div>
        </div>

        {/* 详细错误信息 */}
        {showDetailedInfo && (
          <div className="fixed bottom-4 right-4 p-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 max-w-md z-50">
            <h3 className="text-lg font-medium mb-2">Supabase连接状态</h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">状态:</span>
                <span className="px-2 py-0.5 rounded text-sm bg-red-100 text-red-800">
                  连接错误
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-medium">数据库:</span>
                <span className={`px-2 py-0.5 rounded text-sm ${
                  dbEnabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {dbEnabled ? '正常' : '异常'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-medium">存储服务:</span>
                <span className={`px-2 py-0.5 rounded text-sm ${
                  storageEnabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {storageEnabled ? '正常' : '异常'}
                </span>
              </div>
              
              {storageEnabled && (
                <div>
                  <div className="font-medium mb-1">存储桶:</div>
                  <ul className="text-sm pl-4 space-y-1">
                    {buckets.length === 0 ? (
                      <li className="text-red-500">未找到任何存储桶</li>
                    ) : (
                      buckets.map((bucket: any) => (
                        <li key={bucket.id} className={
                          bucket.name === 'software-images' 
                            ? 'text-green-600 font-medium' 
                            : 'text-gray-600'
                        }>
                          {bucket.name}
                          {bucket.name === 'software-images' && ' ✓'}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
              
              {errorMessage && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {errorMessage}
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }
  
  return null; // 加载中状态不显示
};

export default SupabaseStatusChecker; 