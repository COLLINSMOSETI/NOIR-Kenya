alter table public.products
  drop constraint if exists products_category_check;

alter table public.products
  add constraint products_category_check
  check (category in ('clothes', 'mens_clothing', 'womens_clothing', 'shoes', 'accessories'));

create index if not exists products_category_idx on public.products (category);
