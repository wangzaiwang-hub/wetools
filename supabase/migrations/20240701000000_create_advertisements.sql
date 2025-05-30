-- 创建广告表
CREATE TABLE IF NOT EXISTS public.advertisements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  link TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  upload_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION public.update_advertisements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
DROP TRIGGER IF EXISTS update_advertisements_updated_at ON public.advertisements;
CREATE TRIGGER update_advertisements_updated_at
    BEFORE UPDATE ON public.advertisements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_advertisements_updated_at();

-- 启用RLS
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- 创建策略：匿名用户可以查看广告
CREATE POLICY "匿名用户可查看广告" ON public.advertisements
    FOR SELECT TO anon USING (true);

-- 创建策略：授权用户可以管理广告
CREATE POLICY "授权用户可管理广告" ON public.advertisements
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 创建保存广告的存储过程
CREATE OR REPLACE FUNCTION public.save_advertisement(
    ad_image_url TEXT,
    ad_link TEXT,
    ad_active BOOLEAN DEFAULT true
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
    new_ad_id UUID;
BEGIN
    -- 插入新广告
    INSERT INTO public.advertisements (
        image_url,
        link,
        active,
        upload_verified,
        created_at,
        updated_at
    ) VALUES (
        ad_image_url,
        ad_link,
        ad_active,
        true,
        now(),
        now()
    ) RETURNING id INTO new_ad_id;
    
    -- 获取插入的广告数据
    SELECT row_to_json(a)::JSONB INTO result
    FROM public.advertisements a
    WHERE a.id = new_ad_id;
    
    RETURN json_build_object('success', true, 'data', result);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建检查列是否存在的函数
CREATE OR REPLACE FUNCTION public.check_table_has_column(
    table_name TEXT,
    column_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = check_table_has_column.table_name
        AND column_name = check_table_has_column.column_name
    ) INTO column_exists;
    
    RETURN column_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数用于创建check_table_has_column函数
CREATE OR REPLACE FUNCTION public.create_check_column_function()
RETURNS TEXT AS $$
BEGIN
    -- 函数已在上面创建，这只是一个占位符
    RETURN 'Function already exists';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建一个函数来添加title和description列
CREATE OR REPLACE FUNCTION public.add_columns_to_advertisements()
RETURNS TEXT AS $$
DECLARE
    title_exists BOOLEAN;
    description_exists BOOLEAN;
    result TEXT := '';
BEGIN
    -- 检查title列是否存在
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'advertisements'
        AND column_name = 'title'
    ) INTO title_exists;
    
    -- 检查description列是否存在
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'advertisements'
        AND column_name = 'description'
    ) INTO description_exists;
    
    -- 如果title列不存在，添加它
    IF NOT title_exists THEN
        EXECUTE 'ALTER TABLE public.advertisements ADD COLUMN title TEXT DEFAULT ''广告''';
        result := result || 'Added title column. ';
    END IF;
    
    -- 如果description列不存在，添加它
    IF NOT description_exists THEN
        EXECUTE 'ALTER TABLE public.advertisements ADD COLUMN description TEXT DEFAULT ''精选推广''';
        result := result || 'Added description column.';
    END IF;
    
    IF result = '' THEN
        result := 'No columns were added.';
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 