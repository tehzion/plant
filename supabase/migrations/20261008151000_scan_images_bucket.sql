-- Restore the private scan image bucket and owner-folder policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'scan-images',
    'scan-images',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "scan_images_public_read" on storage.objects;
drop policy if exists "scan_images_select_own_folder" on storage.objects;
create policy "scan_images_select_own_folder" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'scan-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

drop policy if exists "scan_images_insert_own_folder" on storage.objects;
create policy "scan_images_insert_own_folder" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'scan-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

drop policy if exists "scan_images_update_own_folder" on storage.objects;
create policy "scan_images_update_own_folder" on storage.objects
    for update to authenticated
    using (
        bucket_id = 'scan-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    )
    with check (
        bucket_id = 'scan-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

drop policy if exists "scan_images_delete_own_folder" on storage.objects;
create policy "scan_images_delete_own_folder" on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'scan-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );
