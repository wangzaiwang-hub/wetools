import { useState } from 'react';
import toast from 'react-hot-toast';

// 简单上传测试页面
export default function UploadTest() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');

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
    }
  };

  // 通过API上传
  const handleApiUpload = async () => {
    if (!file) {
      toast.error('请先选择文件');
      return;
    }

    try {
      setUploading(true);
      setErrorDetails('');
      toast.loading('正在上传...');

      // 将文件转换为base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 调用上传API
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64,
          filename: `test-upload-${Date.now()}-${file.name.replace(/\s+/g, '_')}`,
          contentType: file.type
        }),
      });

      const result = await response.json();
      setUploadResult(result);

      if (response.ok && result.success) {
        toast.dismiss();
        toast.success('上传成功！');
        setUploadedUrl(result.imageUrl);
      } else {
        throw new Error(result.message || '上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
      toast.dismiss();
      toast.error('上传失败: ' + (error instanceof Error ? error.message : String(error)));
      setErrorDetails(JSON.stringify(error, null, 2));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">图片上传测试</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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
        
        <button
          onClick={handleApiUpload}
          disabled={!file || uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {uploading ? '上传中...' : '通过API上传'}
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
              onError={() => toast.error('无法加载已上传图片')}
            />
          </div>
          <p className="break-all"><strong>URL:</strong> {uploadedUrl}</p>
        </div>
      )}
      
      {uploadResult && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API响应详情</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs">
            {JSON.stringify(uploadResult, null, 2)}
          </pre>
        </div>
      )}
      
      {errorDetails && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-red-600">错误详情</h2>
          <pre className="bg-red-50 p-4 rounded overflow-x-auto text-xs">
            {errorDetails}
          </pre>
        </div>
      )}
    </div>
  );
} 