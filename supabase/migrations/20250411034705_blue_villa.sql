/*
  # Create Messages Table and Related Functions

  1. New Tables
    - Add muting fields to user_profiles
    - Create messages table with reply support
    
  2. Functions
    - Add user muting functions
    - Add message management functions
    
  3. Security
    - Enable RLS
    - Add appropriate policies
*/

-- 在 user_profiles 表中添加禁言字段
alter table public.user_profiles
add column if not exists is_muted boolean default false,
add column if not exists muted_until timestamp with time zone;

-- 删除已存在的表和策略
drop policy if exists "view_messages" on public.messages;
drop policy if exists "create_messages" on public.messages;
drop policy if exists "delete_own_messages" on public.messages;
drop policy if exists "admin_delete_messages" on public.messages;
drop trigger if exists handle_messages_updated_at on public.messages;
drop table if exists public.messages;

-- 创建消息表
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  reply_to_id uuid references public.messages(id) on delete cascade,
  is_deleted boolean default false,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint fk_user_profile foreign key (user_id) references public.user_profiles(user_id) on delete cascade
);

-- 启用 RLS
alter table public.messages enable row level security;

-- 创建触发器以自动更新 updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- 创建检查用户是否被禁言的函数
create or replace function public.is_user_muted(user_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  is_muted boolean;
  muted_until timestamp with time zone;
begin
  select up.is_muted, up.muted_until
  into is_muted, muted_until
  from public.user_profiles up
  where up.user_id = $1;

  return is_muted and (muted_until is null or muted_until > now());
end;
$$;

-- 创建管理员禁言用户的函数
create or replace function public.mute_user(
  target_user_id uuid,
  mute_duration interval default null,
  admin_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
as $$
begin
  -- 检查执行者是否是管理员
  if not exists (
    select 1 from public.user_profiles
    where user_id = admin_user_id and is_admin = true
  ) then
    raise exception '只有管理员才能执行此操作';
  end if;

  -- 更新用户的禁言状态
  update public.user_profiles
  set
    is_muted = true,
    muted_until = case
      when mute_duration is null then null -- 永久禁言
      else now() + mute_duration -- 临时禁言
    end
  where user_id = target_user_id;
end;
$$;

-- 创建管理员解除用户禁言的函数
create or replace function public.unmute_user(
  target_user_id uuid,
  admin_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
as $$
begin
  -- 检查执行者是否是管理员
  if not exists (
    select 1 from public.user_profiles
    where user_id = admin_user_id and is_admin = true
  ) then
    raise exception '只有管理员才能执行此操作';
  end if;

  -- 更新用户的禁言状态
  update public.user_profiles
  set
    is_muted = false,
    muted_until = null
  where user_id = target_user_id;
end;
$$;

create trigger handle_messages_updated_at
  before update on public.messages
  for each row
  execute function public.handle_updated_at();

-- 创建访问策略
create policy "view_messages"
  on public.messages for select
  using (not is_deleted);  -- 只允许查看未删除的消息

create policy "create_messages"
  on public.messages for insert
  with check (
    auth.uid() = user_id and
    not public.is_user_muted(auth.uid())
  );

create policy "delete_own_messages"
  on public.messages for update
  using (auth.uid() = user_id)
  with check (is_deleted = true);

create policy "admin_delete_messages"
  on public.messages for update
  using (
    exists (
      select 1 from public.user_profiles
      where user_id = auth.uid() and is_admin = true
    )
  )
  with check (is_deleted = true);