create schema extensions;

-- make sure everybody can use everything in the extensions schema
grant usage on schema extensions to public;
grant execute on all functions in schema extensions to public;

-- include future extensions
alter default privileges in schema extensions
   grant execute on functions to public;

alter default privileges in schema extensions
   grant usage on types to public;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto schema extensions;

-- Create the pubman_api user if it doesn't exist
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_roles
        WHERE rolname = 'pubman_api') THEN
        CREATE USER pubman_api WITH PASSWORD 'changeme';
    END IF;
END
$$;

-- Create the database if it doesn't exist
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_database
        WHERE datname = 'pubman_db') THEN
        CREATE DATABASE pubman_db;
    END IF;
END
$$;

-- Connect to the database
\c pubman_db;

-- Grant database permissions to postgres superuser
GRANT CONNECT ON DATABASE pubman_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE pubman_db TO postgres;


-- Create the pubman_db schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS pubman_db;

-- Grant schema permissions to postgres superuser
GRANT USAGE ON SCHEMA pubman_db TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA pubman_db TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA pubman_db TO postgres;

-- Basic permissions on pubman database and schema
GRANT CONNECT ON DATABASE pubman_db TO pubman_api;
GRANT USAGE ON SCHEMA pubman_db TO pubman_api;

ALTER ROLE pubman_api SET search_path TO pubman_db,public;

-- Set the search path to the pubman_db schema
SET search_path TO pubman_db, extensions;

-- Grant read, write, and execute permissions on all tables in the schema to pubman_api
ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA pubman_db
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pubman_api;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA pubman_db TO pubman_api;

-- Grant usage and update permissions on all sequences in the schema to pubman_api
ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA pubman_db
    GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO pubman_api;
-- GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA pubman_db TO pubman_api;

-- Grant execute permissions on all functions in the schema to pubman_api
ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA pubman_db
    GRANT EXECUTE ON FUNCTIONS TO pubman_api;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pubman_db TO pubman_api;

-- Create the design table if it doesn't exist
CREATE TABLE IF NOT EXISTS designs (
    id SERIAL PRIMARY KEY,
    design_key CHAR(8) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER NOT NULL
);

-- Function to generate a unique 8-character design_key
CREATE OR REPLACE FUNCTION generate_design_key()
RETURNS TRIGGER AS $$
DECLARE
    key CHAR(8);
BEGIN
    LOOP
        -- Generate a random 8-character key
        key := substring(md5(random()::text) from 1 for 8);

        -- Ensure the key is unique
        EXIT WHEN NOT EXISTS (SELECT 1 FROM designs WHERE design_key = key);
    END LOOP;
    NEW.design_key := key;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set the design_key before inserting a new row
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_design_key') THEN
        CREATE TRIGGER set_design_key
        BEFORE INSERT ON designs
        FOR EACH ROW
        EXECUTE FUNCTION generate_design_key();
    END IF;
END
$$;

-- Create the users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(50) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);

-- Create a trigger to update the updated_at column on row update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Insert a test user if it doesn't exist
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM users
        WHERE username = 'testuser'
    ) THEN
        INSERT INTO users (username, email, password_hash) VALUES (
        'testuser', 'testuser@example.com', '$2b$12$LP3Fcmc7AnXMozTXGCixp.rGSwt6L.z3KlN0Kc6AptBPyRz4r5Pva' -- hash of 'testpass'
        );
    END IF;
END
$$;

-- Insert an example design associated with the test user if it doesn't exist
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM designs
        WHERE name = 'example_design' AND user_id = 1) THEN
        INSERT INTO designs (name, description, user_id) VALUES ('example_design', 'This is an example design.', 1);
    END IF;
END
$$;
