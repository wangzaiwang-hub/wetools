-- 添加 tags 列到 software 表
ALTER TABLE software ADD COLUMN tags TEXT[];

-- Add title and description columns to advertisements table
ALTER TABLE IF EXISTS public.advertisements 
ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '广告',
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '精选推广';