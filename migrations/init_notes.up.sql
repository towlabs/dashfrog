CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    title VARCHAR NOT NULL,
    description VARCHAR,
    locked bool NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE blocks (
    id VARCHAR PRIMARY KEY,
    note_id SERIAL REFERENCES  notes (id) ON DELETE CASCADE,
    kind VARCHAR NOT NULL,
    content JSON,
    position INTEGER
);
