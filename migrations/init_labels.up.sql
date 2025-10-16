CREATE TYPE LABEL_SRC_KIND AS ENUM (
    'workflow', 'metrics'
);

CREATE TABLE labels (
 id SERIAL PRIMARY KEY,
 label VARCHAR NOT NULL UNIQUE,
 description VARCHAR
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