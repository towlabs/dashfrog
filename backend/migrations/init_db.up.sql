DROP TABLE if exists flows;
DROP TABLE if exists steps;
DROP VIEW if exists flows_mv;
DROP VIEW if exists steps_mv;

CREATE TABLE IF NOT EXISTS dashfrog.flows (
    name String,
    description String,
    labels Map(String, String),
    timestamp DateTime,
    trace_id String,
    span_id String,
    parent_id String,
    service_name String,
    global_state String,
    status String,
    status_message String
)
ENGINE=MergeTree
ORDER BY (trace_id, parent_id, name, timestamp);

CREATE MATERIALIZED VIEW IF NOT EXISTS dashfrog.flows_mv TO dashfrog.flows
AS
    SELECT
        SpanAttributes['flow.name'] as name, SpanAttributes['flow.description'] as description,
        mapConcat(mapExtractKeyLike(SpanAttributes, 'label.%'), mapExtractKeyLike(ResourceAttributes, 'label.%')) as labels,
        Timestamp as timestamp, TraceId as trace_id, SpanId as span_id,
        ParentSpanId as parent_id, ServiceName as service_name,
        TraceState as global_state, StatusCode as status,
        StatusMessage as status_message
    FROM dashfrog.otel_traces
    WHERE SpanAttributes['app.open_tel.helper'] = 'dashfrog' AND SpanAttributes['flow.name'] IS NOT NULL AND SpanAttributes['flow.name'] != '';

CREATE MATERIALIZED VIEW IF NOT EXISTS dashfrog.latest_flows
REFRESH AFTER 5 minute
ENGINE=MergeTree
ORDER BY (name, timestamp)
AS
    SELECT
        name, argMax(description, flows.timestamp) as description, argMax(labels, flows.timestamp) as labels,
        max(timestamp) as timestamp, argMax(trace_id, flows.timestamp) as trace_id, argMax(service_name, flows.timestamp) as service_name,
        argMax(global_state, flows.timestamp) as global_state, argMax(status, flows.timestamp) as status,
        argMax(status_message, flows.timestamp) as status_message
    FROM dashfrog.flows as flows
    GROUP BY name;


CREATE TABLE IF NOT EXISTS dashfrog.steps (
    name String,
    description String,
    labels Map(String, String),
    timestamp DateTime,
    trace_id String,
    span_id String,
    parent_id String,
    service_name String,
    global_state String,
    status String,
    status_message String
)
ENGINE=MergeTree
ORDER BY (trace_id, parent_id, name, timestamp);

CREATE MATERIALIZED VIEW IF NOT EXISTS dashfrog.steps_mv TO dashfrog.steps
AS
    SELECT
        SpanAttributes['step.name'] as name, SpanAttributes['step.description'] as description,
        mapConcat(mapExtractKeyLike(SpanAttributes, 'label.%'), mapExtractKeyLike(ResourceAttributes, 'label.%')) as labels,
        Timestamp as timestamp, TraceId as trace_id, SpanId as span_id,
        ParentSpanId as parent_id, ServiceName as service_name,
        TraceState as global_state, StatusCode as status,
        StatusMessage as status_message
    FROM dashfrog.otel_traces
    WHERE SpanAttributes['app.open_tel.helper'] = 'dashfrog' AND SpanAttributes['step.name'] IS NOT NULL AND SpanAttributes['step.name'] != '';