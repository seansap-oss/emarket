-- Run after schema.sql on Supabase. Public product media only; no private documents.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('marketplace','marketplace',true,6291456,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']) on conflict(id) do nothing;
create policy public_media on storage.objects for select using(bucket_id='marketplace');
create policy own_media_insert on storage.objects for insert to authenticated with check(bucket_id='marketplace' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy own_media_delete on storage.objects for delete to authenticated using(bucket_id='marketplace' and ((storage.foldername(name))[1]=(select auth.uid())::text or private.is_admin()));
