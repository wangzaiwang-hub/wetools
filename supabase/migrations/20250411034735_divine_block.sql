/*
  # Update Messages Table Foreign Keys and Policies

  1. Changes
    - Update foreign key constraints with proper cascade behavior
    - Drop and recreate policies with proper naming
    - Ensure no policy name conflicts
*/

-- 先删除现有的外键约束
alter table public.messages
  drop constraint if exists messages_reply_to_id_fkey,
  drop constraint if exists messages_deleted_by_fkey;

-- 重新添加外键约束，包含级联删除
alter table public.messages
  add constraint messages_reply_to_id_fkey 
    foreign key (reply_to_id) 
    references public.messages(id) 
    on delete cascade,
  add constraint messages_deleted_by_fkey 
    foreign key (deleted_by) 
    references auth.users(id) 
    on delete set null;

-- 删除所有现有的消息相关策略
drop policy if exists "delete_messages" on public.messages;
drop policy if exists "delete_own_messages" on public.messages;
drop policy if exists "admin_delete_messages" on public.messages;
drop policy if exists "view_messages" on public.messages;
drop policy if exists "create_messages" on public.messages;

-- 重新创建所有策略
create policy "所有人都可以查看未删除的消息"
  on public.messages for select
  using (not is_deleted);

create policy "已认证用户可以创建消息"
  on public.messages for insert
  with check (
    auth.uid() = user_id and
    not public.is_user_muted(auth.uid())
  );

create policy "用户可以删除自己的消息"
  on public.messages for update
  using (auth.uid() = user_id)
  with check (is_deleted = true);

create policy "管理员可以删除任何消息"
  on public.messages for update
  using (
    exists (
      select 1 from public.user_profiles
      where user_id = auth.uid() and is_admin = true
    )
  )
  with check (is_deleted = true);