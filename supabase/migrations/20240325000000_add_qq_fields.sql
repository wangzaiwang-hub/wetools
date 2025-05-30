-- 添加QQ相关字段到user_profiles表
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS qq_open_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_profiles_qq_open_id ON user_profiles(qq_open_id);

-- 更新RLS策略
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以读取自己的资料"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的资料"
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id); 