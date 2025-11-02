-- Fix security issues by setting search_path on the function
ALTER FUNCTION get_group_grades(TEXT) SET search_path = public, pg_temp;