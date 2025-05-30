-- 删除现有的策略
drop policy if exists "view_messages" on public.messages;
drop policy if exists "create_messages" on public.messages;
drop policy if exists "delete_messages" on public.messages;

-- 创建新的访问策略
create policy "view_messages"
  on public.messages for select
  using (true);  -- 允许查看所有消息

create policy "create_messages"
  on public.messages for insert
  with check (
    auth.uid() = user_id
  );

create policy "delete_messages"
  on public.messages for delete
  using (
    -- 允许用户删除自己的消息或管理员删除任何消息
    auth.uid() = user_id or
    exists (
      select 1 from public.user_profiles
      where user_id = auth.uid() and is_admin = true
    )
  ); 