-- 删除现有的website_stars表（如果存在）
DROP TABLE IF EXISTS public.website_stars CASCADE;

-- 重新创建website_stars表，包含所有必要的字段
CREATE TABLE public.website_stars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  website_id uuid REFERENCES websites(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, website_id)
);

-- 启用行级安全
ALTER TABLE public.website_stars ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "Users can star websites"
  ON public.website_stars
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their stars"
  ON public.website_stars
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view website stars"
  ON public.website_stars
  FOR SELECT TO public
  USING (true);

-- 创建函数来获取网站星标数量
CREATE OR REPLACE FUNCTION public.get_website_star_counts()
RETURNS TABLE (website_id uuid, star_count bigint) AS $$
BEGIN
  RETURN QUERY
    SELECT ws.website_id, COUNT(*) as star_count
    FROM public.website_stars ws
    GROUP BY ws.website_id;
END;
$$ LANGUAGE plpgsql; 