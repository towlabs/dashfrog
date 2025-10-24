CREATE TYPE LABEL_SRC_KIND AS ENUM (
    'workflow', 'metrics'
);
CREATE TYPE METRIC_KIND AS ENUM (
    'counter', 'measure', 'stats', 'other'
);

CREATE TABLE labels (
 id SERIAL PRIMARY KEY,
 label VARCHAR NOT NULL UNIQUE,
 display_as VARCHAR unique,
 description VARCHAR,
 hide BOOLEAN DEFAULT FALSE
);


CREATE TABLE metrics (
    id SERIAL PRIMARY KEY,
    key VARCHAR not null unique,
    kind METRIC_KIND NOT NULL,
    scope VARCHAR NOT NULL,
    unit VARCHAR,
    display_as VARCHAR unique,
    description VARCHAR,
    associated_identifiers VARCHAR[]
);

CREATE TABLE metrics_scrapped (
    id SERIAL PRIMARY KEY,
    ran_at TIMESTAMPTZ default NOW() UNIQUE
);

CREATE TABLE label_values (
    label_id SERIAL REFERENCES labels (id) ON DELETE CASCADE ,
    value VARCHAR NOT NULL,
    mapped_to VARCHAR,
    PRIMARY KEY (label_id, value),
    UNIQUE(label_id, mapped_to)
);

CREATE TABLE label_usage (
    label_id SERIAL REFERENCES labels (id) ON DELETE CASCADE,
    used_in VARCHAR NOT NULL,
    kind LABEL_SRC_KIND NOT NULL DEFAULT 'workflow',
    PRIMARY KEY (label_id, used_in)
);

CREATE TABLE labels_scrapped (
    id SERIAL PRIMARY KEY,
    ran_at TIMESTAMPTZ default NOW() UNIQUE
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR NOT NULL,
    description TEXT,
    kind VARCHAR NOT NULL,
    labels JSON,
    created_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);