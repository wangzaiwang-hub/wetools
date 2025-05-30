-- 创建 avatars 存储桶
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 允许已认证用户上传头像
create policy "允许已认证用户上传头像"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars');

-- 允许所有人查看头像
create policy "允许所有人查看头像"
on storage.objects for select
to public
using (bucket_id = 'avatars');

-- 允许用户删除自己的头像
create policy "允许用户删除自己的头像"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]); 