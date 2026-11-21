-- Extensions the schema needs, before any table (Drizzle migrations follow).
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;
