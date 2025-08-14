-- Add view mode controls to display_settings table
ALTER TABLE public.display_settings 
ADD COLUMN enable_all_view boolean NOT NULL DEFAULT true,
ADD COLUMN enable_single_view boolean NOT NULL DEFAULT true,
ADD COLUMN default_view text NOT NULL DEFAULT 'single' CHECK (default_view IN ('all', 'single'));