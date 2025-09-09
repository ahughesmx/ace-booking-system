-- Enable pg_net extension for HTTP requests in cronjobs
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant necessary permissions for cronjobs to use pg_net
GRANT USAGE ON SCHEMA net TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA net TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA net TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA net TO postgres;