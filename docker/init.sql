CREATE USER supabase_auth_admin WITH PASSWORD 'local-auth-only';
CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;
ALTER ROLE supabase_auth_admin SET search_path=auth;
GRANT ALL ON DATABASE promotions TO supabase_auth_admin;
