insert into public.genres (name, slug)
values
  ('Нууцлаг', 'mystery'),
  ('Романс', 'romance')
on conflict do nothing;
