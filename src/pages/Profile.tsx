import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Camera, Mail, ChevronDown, ChevronUp, Edit2, Save, LogOut, ArrowLeft, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, uploadAvatar } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, updateProfile, signOut, userPreferences, updatePreferences } = useAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
  const [isPreferencesSectionOpen, setIsPreferencesSectionOpen] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [originalNickname, setOriginalNickname] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [preferencesChanged, setPreferencesChanged] = useState(false);
  const [preferencesJustSaved, setPreferencesJustSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setNickname(user.user_metadata?.nickname || '');
      setOriginalNickname(user.user_metadata?.nickname || '');
      setAvatar(user.user_metadata?.avatar_url || '');
      setItemsPerPage(userPreferences.itemsPerPage);
      setPreferencesChanged(false);
      setPreferencesJustSaved(false);
    }
  }, [user, userPreferences]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const avatarUrl = await uploadAvatar(file, user.id);
      await updateProfile({ avatar_url: avatarUrl });
      setAvatar(avatarUrl);
      toast.success('头像更新成功');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('头像上传失败');
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await updateProfile({ nickname });
      setOriginalNickname(nickname);
      setIsEditingNickname(false);
      toast.success('个人信息更新成功');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('更新失败');
    }
  };

  const togglePasswordSection = () => {
    setIsPasswordSectionOpen(!isPasswordSectionOpen);
  };

  const togglePreferencesSection = () => {
    setIsPreferencesSectionOpen(!isPreferencesSectionOpen);
  };

  const toggleNicknameEdit = () => {
    if (isEditingNickname) {
      // 如果正在编辑，点击保存
      handleUpdateProfile();
    } else {
      // 如果不在编辑状态，进入编辑状态
      setIsEditingNickname(true);
    }
  };

  const cancelNicknameEdit = () => {
    setNickname(originalNickname);
    setIsEditingNickname(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('退出登录失败');
    }
  };

  const handleUpdatePreferences = async () => {
    try {
      await updatePreferences({ itemsPerPage });
      toast.success('偏好设置已更新');
      setPreferencesChanged(false);
      setPreferencesJustSaved(true);
      
      // 3秒后重置保存状态
      setTimeout(() => {
        setPreferencesJustSaved(false);
      }, 3000);
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('更新偏好设置失败');
    }
  };

  // 在itemsPerPage值变化时更新状态
  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setPreferencesChanged(value !== userPreferences.itemsPerPage);
    setPreferencesJustSaved(false);
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <p className="text-gray-600">登录后即可查看和编辑个人信息</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-blue-500"
          >
            <ArrowLeft size={20} className="mr-2" />
            返回
          </button>
        </div>
        <h1 className="text-2xl font-bold mb-8">个人中心</h1>
        
        {/* 头像上传 */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {avatar ? (
                <img
                  src={avatar}
                  alt="头像"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <User size={40} className="text-gray-400" />
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 p-1 bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600 transition-colors"
              >
                <Camera size={16} className="text-white" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold">头像</h2>
              <p className="text-gray-500 text-sm">支持 JPG、PNG 格式，大小不超过 2MB</p>
            </div>
          </div>
        </div>

        {/* 用户信息 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">账号信息</h2>
          
          {/* 邮箱信息 */}
          <div className="flex items-center space-x-4 mb-4 bg-gray-50 p-3 rounded-lg">
            <Mail size={20} className="text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">登录邮箱</p>
              <p className="font-medium">{user.email}</p>
            </div>
          </div>
        </div>

        {/* 昵称设置 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">昵称</h2>
          <div className="flex space-x-4">
            <input
              type="text"
              value={nickname}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNickname(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入昵称"
              disabled={!isEditingNickname}
            />
            {isEditingNickname ? (
              <div className="flex space-x-2">
                <button
                  onClick={handleUpdateProfile}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center"
                >
                  <Save size={16} className="mr-1" />
                  <span>保存</span>
                </button>
                <button
                  onClick={cancelNicknameEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={toggleNicknameEdit}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center"
              >
                <Edit2 size={16} className="mr-1" />
                <span>修改</span>
              </button>
            )}
          </div>
        </div>

        {/* 偏好设置（折叠） */}
        <div className="mb-8">
          <button
            onClick={togglePreferencesSection}
            className="flex items-center justify-between w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <h2 className="text-lg font-semibold">偏好设置</h2>
            {isPreferencesSectionOpen ? (
              <ChevronUp size={20} />
            ) : (
              <ChevronDown size={20} />
            )}
          </button>
          
          {isPreferencesSectionOpen && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">每页显示卡片数量</label>
                <div className="flex items-center space-x-4">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={6}>6 个</option>
                    <option value={9}>9 个</option>
                    <option value={12}>12 个</option>
                    <option value={15}>15 个</option>
                    <option value={18}>18 个</option>
                    <option value={24}>24 个</option>
                  </select>
                  {preferencesJustSaved ? (
                    <button
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center"
                      disabled
                    >
                      <Settings size={16} className="mr-1" />
                      <span>已修改</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleUpdatePreferences}
                      className={`px-4 py-2 ${preferencesChanged ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-200 hover:bg-gray-300'} text-${preferencesChanged ? 'white' : 'gray-700'} rounded-lg transition-colors flex items-center`}
                      disabled={!preferencesChanged}
                    >
                      <Save size={16} className="mr-1" />
                      <span>保存</span>
                    </button>
                  )}
                </div>
                <p className="text-gray-500 text-sm mt-2">
                  设置在软件列表和网站列表中每页显示的卡片数量。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 密码修改（折叠） */}
        <div className="mb-8">
          <button
            onClick={togglePasswordSection}
            className="flex items-center justify-between w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <h2 className="text-lg font-semibold">修改密码</h2>
            {isPasswordSectionOpen ? (
              <ChevronUp size={20} />
            ) : (
              <ChevronDown size={20} />
            )}
          </button>
          
          {isPasswordSectionOpen && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-4">
                您可以通过以下方式修改密码：
              </p>
              <div className="space-y-2">
                <Link
                  to="/forgot-password"
                  className="block w-full px-4 py-2 text-center bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  通过邮箱验证码修改密码
                </Link>
                <Link
                  to="/login"
                  className="block w-full px-4 py-2 text-center bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  通过登录页面修改密码
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 退出登录按钮 */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
          >
            <LogOut size={16} className="mr-1" />
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;