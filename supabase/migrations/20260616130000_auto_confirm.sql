-- Auto-confirm newly signed up users (bypass TLD and email checks)
create or replace function public.auto_confirm_user()
returns trigger as $$
begin
  new.email_confirmed_at = now();
  new.confirmed_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger on auth.users table
drop trigger if exists auto_confirm_user_trigger on auth.users;
create trigger auto_confirm_user_trigger
  before insert on auth.users
  for each row
  execute function public.auto_confirm_user();
