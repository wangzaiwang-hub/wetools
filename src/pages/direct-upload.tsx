import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 创建Supabase客户端
const supabaseUrl = 'https://qkfzknvbibzsmzfcrysb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrZnprbnZiaWJ6c216ZmNyeXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0NTExMzMsImV4cCI6MjA1NjAyNzEzM30.vfzNUZtA0Rsw1tMCHUCKropd9ufEN04ZT-Pklz_ONdo';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function DirectUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [buckets, setBuckets] = useState<string[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>('software-images');
  const [uploadPath, setUploadPath] = useState<string>('');

  // 获取存储桶列表
  useEffect(() => {
    async function fetchBuckets() {
      try {
        const { data, error } = await supabase.storage.listBuckets();
        if (error) {
          console.error('获取存储桶列表失败:', error);
          setErrorMessage(`获取存储桶失败: ${error.message}`);
        } else if (data) {
          console.log('存储桶列表:', data);
          setBuckets(data.map(bucket => bucket.name));
          if (data.length > 0 && !selectedBucket) {
            setSelectedBucket(data[0].name);
          }
        }
      } catch (error) {
        console.error('获取存储桶时出错:', error);
        setErrorMessage(`获取存储桶出错: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    fetchBuckets();
  }, []);

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // 创建预览
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(selectedFile);
      
      // 设置默认上传路径
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 10);
      setUploadPath(`direct-${timestamp}-${randomId}-${selectedFile.name.replace(/\s+/g, '_')}`);
    }
  };

  // 直接上传到Supabase
  const handleDirectUpload = async () => {
    if (!file) {
      setErrorMessage('请先选择文件');
      return;
    }

    if (!selectedBucket) {
      setErrorMessage('请选择存储桶');
      return;
    }

    const path = uploadPath || `direct-${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

    try {
      setUploading(true);
      setErrorMessage('');
      setUploadResult(null);
      
      console.log(`尝试上传文件到存储桶 ${selectedBucket}，路径: ${path}`);
      console.log('文件信息:', file.name, file.type, file.size);
      
      // 尝试直接上传
      const { data, error } = await supabase.storage
        .from(selectedBucket)
        .upload(path, file, {
          contentType: file.type,
          upsert: true
        });
      
      if (error) {
        console.error('上传失败:', error);
        
        // 保存详细错误信息
        setUploadResult({
          success: false,
          error: error,
          errorMessage: error.message,
          errorDetails: JSON.stringify(error, null, 2)
        });
        
        setErrorMessage(`上传失败: ${error.message}`);
      } else {
        console.log('上传成功:', data);
        
        // 获取公共URL
        const { data: urlData } = supabase.storage
          .from(selectedBucket)
          .getPublicUrl(data.path);
        
        setUploadedUrl(urlData.publicUrl);
        setUploadResult({
          success: true,
          data: data,
          publicUrl: urlData.publicUrl
        });
      }
    } catch (error) {
      console.error('上传过程中出错:', error);
      setUploadResult({
        success: false, 
        error: error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      setErrorMessage(`上传过程中出错: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">直接上传到Supabase存储</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <p className="mb-2">
            <strong>Supabase URL:</strong> {supabaseUrl}<br />
            <strong>Supabase 密钥:</strong> {supabaseKey.substring(0, 10)}...
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 font-medium">选择存储桶</label>
          <select 
            value={selectedBucket} 
            onChange={(e) => setSelectedBucket(e.target.value)}
            className="border border-gray-300 p-2 w-full rounded"
            disabled={uploading || buckets.length === 0}
          >
            {buckets.length === 0 && <option value="">-- 加载中 --</option>}
            {buckets.map((bucket) => (
              <option key={bucket} value={bucket}>{bucket}</option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 font-medium">文件路径（可选）</label>
          <input 
            type="text" 
            value={uploadPath} 
            onChange={(e) => setUploadPath(e.target.value)}
            placeholder="例如: images/example.jpg" 
            className="border border-gray-300 p-2 w-full rounded"
            disabled={uploading}
          />
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 font-medium">选择图片</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange}
            className="border border-gray-300 p-2 w-full rounded"
            disabled={uploading}
          />
        </div>
        
        {preview && (
          <div className="mb-4">
            <p className="mb-2 font-medium">预览</p>
            <img 
              src={preview} 
              alt="预览" 
              className="w-48 h-48 object-cover border rounded"
            />
          </div>
        )}
        
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {errorMessage}
          </div>
        )}
        
        <button
          onClick={handleDirectUpload}
          disabled={!file || uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {uploading ? '上传中...' : '直接上传到Supabase'}
        </button>
      </div>
      
      {uploadedUrl && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">上传结果</h2>
          <div className="mb-4">
            <p className="mb-2 font-medium">上传的图片</p>
            <img 
              src={uploadedUrl} 
              alt="已上传" 
              className="w-64 h-64 object-cover border rounded"
              onError={() => setErrorMessage('无法加载已上传图片，权限可能受限')}
            />
          </div>
          <p className="break-all"><strong>URL:</strong> {uploadedUrl}</p>
        </div>
      )}
      
      {uploadResult && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{uploadResult.success ? '成功详情' : '错误详情'}</h2>
          <pre className={`p-4 rounded overflow-x-auto text-xs ${uploadResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
            {JSON.stringify(uploadResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 