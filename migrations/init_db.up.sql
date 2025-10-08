DROP TABLE if exists dashfrog.flow_events;
DROP TABLE if exists dashfrog.step_events;
DROP TABLE if exists dashfrog.flows;
DROP VIEW if exists dashfrog.flows;
DROP VIEW if exists dashfrog.flows_mv;

CREATE TABLE IF NOT EXISTS dashfrog.flow_events (
    name LowCardinality(String),
    service_name LowCardinality(Nullable(String)),
    description Nullable(String),
    labels Map(LowCardinality(String), String),
    trace_id String,
    status LowCardinality(Nullable(String)),
    status_message Nullable(String),
    created_at DateTime64(9),
    started_at Nullable(DateTime64(9)),
    ended_at Nullable(DateTime64(9)),
    duration Nullable(UInt64)
)
ENGINE=MergeTree
PRIMARY KEY (trace_id, name)
ORDER BY (trace_id, name, created_at);


CREATE TABLE IF NOT EXISTS dashfrog.step_events (
    id String,
    name LowCardinality(Nullable(String)),
    description Nullable(String),
    labels Map(LowCardinality(String), String),
    trace_id String,
    for_flow LowCardinality(String),
    parent_id Nullable(String),
    status LowCardinality(Nullable(String)),
    status_message Nullable(String),
    created_at DateTime64(9),
    started_at  Nullable(DateTime64(9)),
    ended_at  Nullable(DateTime64(9)),
    duration Nullable(UInt64)
)
ENGINE=MergeTree
PRIMARY KEY (for_flow, id)
ORDER BY (for_flow, id, created_at);

CREATE TABLE IF NOT EXISTS dashfrog.flows (
    service_name LowCardinality(String),
    name LowCardinality(String),
    description Nullable(String),
    labels Map(LowCardinality(String), String),
    trace_id String,
    status LowCardinality(String),
    status_message Nullable(String),
    created_at DateTime64(9),
    started_at Nullable(DateTime64(9)),
    ended_at Nullable(DateTime64(9)),
    duration Nullable(UInt64)
)
ENGINE=MergeTree
PRIMARY KEY (trace_id, name)
ORDER BY (trace_id, name, created_at);

CREATE MATERIALIZED VIEW dashfrog.flows_mv
REFRESH EVERY 1 MINUTES
TO dashfrog.flows
AS SELECT
    trace_id as trace_id, name as name, any(service_name) as service_name, any(description) as description,
    any(labels) as labels,  argMax(status, coalesce(events.ended_at, events.started_at, events.created_at)) as status,
    argMax(status_message, coalesce(events.ended_at, events.started_at, events.created_at))  as status_message,
    min(created_at) as created_at, min(started_at) as started_at, max(ended_at) as ended_at,
    IF(
        any(events.ended_at) is not Null,
        coalesce(
            max(duration),
            abs(dateDiff('ms', created_at, ended_at)) -- duration cannot be negative
        ),
        NULL
    ) as duration
FROM dashfrog.flow_events as events GROUP BY trace_id, name;
