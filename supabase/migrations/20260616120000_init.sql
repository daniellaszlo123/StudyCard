-- Initial database schema for StudyCard Cloud Sync
create table if not exists studycard_sync (
  user_id uuid references auth.users not null primary key,
  decks jsonb default '[]'::jsonb,
  banks jsonb default '[]'::jsonb,
  stats jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table studycard_sync enable row level security;

-- Create policy for users to manage their own data row
create policy "Users can manage their own data"
  on studycard_sync for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
