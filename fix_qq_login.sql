-- Supabase QQ登录修复脚本 (RPC版本)

-- *****************************************************************************
-- 步骤 1: 创建一个数据库函数 (RPC)，用于安全地检查用户是否存在
-- *****************************************************************************
-- 此函数接收一个 qq_open_id，并返回布尔值 (true/false)。
-- 它可以在客户端被安全地调用，以绕过RLS策略来检查用户存在性，
-- 而不会暴露任何敏感数据。

CREATE OR REPLACE FUNCTION public.user_exists_by_qq_openid(p_qq_open_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- 使用定义者的权限执行
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1
    FROM public.user_profiles
    WHERE qq_open_id = p_qq_open_id
  );
END;
$$;

-- *****************************************************************************
-- 步骤 2: 修复 `user_profiles` 表的行级安全 (RLS) 策略
-- *****************************************************************************
-- 当前代码逻辑下，新用户注册成功后，需要在客户端插入一条记录到 `user_profiles`。
-- 以下策略将允许已登录的用户为自己创建个人资料记录。

-- 首先移除可能存在的旧策略，以避免冲突
DROP POLICY IF EXISTS "用户可以为自己创建个人资料" ON public.user_profiles;

-- 创建新的 INSERT 策略
CREATE POLICY "用户可以为自己创建个人资料"
ON public.user_profiles FOR INSERT
WITH CHECK ( auth.uid() = user_id );

-- *****************************************************************************
-- 步骤 3: 查找 `user_profiles` 表中可能导致问题的重复 `qq_open_id`
-- *****************************************************************************
-- 运行此查询来识别所有具有重复 qq_open_id 的记录。
-- 406错误强烈暗示这个问题的存在。
-- 您需要在Supabase后台根据业务逻辑手动清理这些重复数据。
-- 例如，保留最新的一个，删除旧的，或者合并信息。

SELECT qq_open_id, COUNT(*)
FROM public.user_profiles
WHERE qq_open_id IS NOT NULL AND qq_open_id != ''
GROUP BY qq_open_id
HAVING COUNT(*) > 1;

-- *****************************************************************************
-- 脚本结束
-- ***************************************************************************** 