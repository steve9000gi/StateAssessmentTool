DROP SCHEMA IF EXISTS sat CASCADE;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA sat;

CREATE TABLE sat.users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(80) UNIQUE,
  password VARCHAR(80),
  auth_token UUID UNIQUE DEFAULT gen_random_uuid(),
  is_admin BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE sat.surveys (
  id SERIAL PRIMARY KEY,
  owner INTEGER REFERENCES sat.users(id) NOT NULL,
  document JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  modified_at TIMESTAMP NOT NULL DEFAULT now()
);

