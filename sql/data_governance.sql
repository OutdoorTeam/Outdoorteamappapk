-- Verificación de RLS en tablas críticas
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename in ('users','profiles','habit_logs','entitlements');

-- Índice recomendado para logs de hábitos por usuario/fecha
create index concurrently if not exists habit_logs_user_day_idx
  on public.habit_logs (user_id, day);

-- Constraint para garantizar pasos no negativos
alter table public.habit_logs
  add constraint habit_logs_steps_nonnegative
  check (steps >= 0);

-- Trigger para mantener full_name consistente
create or replace function public.set_full_name()
returns trigger as $$
begin
  new.full_name := coalesce(trim(new.nombre || ' ' || new.apellido), new.full_name, '');
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_full_name
before insert or update on public.profiles
for each row execute function public.set_full_name();
