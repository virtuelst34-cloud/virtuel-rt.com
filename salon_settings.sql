create table salon_settings (
 id uuid primary key default gen_random_uuid(),
 salon_id uuid not null unique,
 welcome_message text,
 welcome_enabled boolean default true,
 created_at timestamptz default now(),
 updated_at timestamptz default now()
);

alter table salon_settings enable row level security;

create policy "read salon settings" on salon_settings for select using (true);
