DROP TABLE if exists flows;
DROP TABLE if exists steps;

CREATE TABLE IF NOT EXISTS dashfrog.flows (
    service_name String,
    name String,
    description String,
    labels Map(String, String),
    trace_id String,
    status String,
    status_message String,
    created_at DateTime,
    started_at timestamp,
    ended_at timestamp,
    duration Time
)
ENGINE=MergeTree
PRIMARY KEY (trace_id, name)
ORDER BY (trace_id, name, created_at);


CREATE TABLE IF NOT EXISTS dashfrog.steps (
    id String,
    name String,
    description String,
    labels Map(String, String),
    trace_id String,
    for_flow String,
    parent_id String,
    service_name String,
    status String,
    status_message String,
    created_at DateTime,
    started_at timestamp,
    ended_at timestamp,
    duration Time
)
ENGINE=MergeTree
PRIMARY KEY (trace_id, name, id)
ORDER BY (trace_id, for_flow, name, created_at);
