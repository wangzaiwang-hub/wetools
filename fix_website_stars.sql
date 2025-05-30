-- 添加website_id字段到website_stars表
ALTER TABLE public.website_stars
ADD COLUMN IF NOT EXISTS website_id uuid REFERENCES websites(id);

-- 更新INSERT策略，考虑website_id
DROP POLICY IF EXISTS "Users can star website once" ON public.website_stars;
CREATE POLICY "Users can star website once"
  ON public.website_stars
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM public.website_stars 
      WHERE user_id = auth.uid() AND website_id = NEW.website_id
    )
  );

-- 更新DELETE策略，考虑website_id
DROP POLICY IF EXISTS "Users can remove their star" ON public.website_stars;
CREATE POLICY "Users can remove their star"
  ON public.website_stars
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 创建获取网站星标数量的函数
CREATE OR REPLACE FUNCTION public.get_website_star_counts()
RETURNS TABLE (website_id uuid, star_count bigint) AS $$
BEGIN
  RETURN QUERY
    SELECT ws.website_id, COUNT(*) as star_count
    FROM public.website_stars ws
    WHERE ws.website_id IS NOT NULL
    GROUP BY ws.website_id;
END;
$$ LANGUAGE plpgsql; 