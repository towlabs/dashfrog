{{/*
Expand the name of the chart.
*/}}
{{- define "dashfrog.name" -}}
{{- default .Chart.Name .Values.api.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "dashfrog.fullname" -}}
{{- if .Values.api.fullnameOverride }}
{{- .Values.api.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.api.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "dashfrog.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "dashfrog.labels" -}}
helm.sh/chart: {{ include "dashfrog.chart" . }}
{{ include "dashfrog.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "dashfrog.selectorLabels" -}}
app.kubernetes.io/name: {{ include "dashfrog.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "dashfrog.serviceAccountName" -}}
{{- if .Values.api.serviceAccount.create }}
{{- default (include "dashfrog.fullname" .) .Values.api.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.api.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
PostgreSQL host
*/}}
{{- define "dashfrog.postgresHost" -}}
{{- if .Values.api.config.postgresHost }}
{{- .Values.api.config.postgresHost }}
{{- else if .Values.postgresql.enabled }}
{{- printf "%s-postgresql" .Release.Name }}
{{- else }}
{{- fail "PostgreSQL host must be specified when postgresql.enabled is false" }}
{{- end }}
{{- end }}

{{/*
OTLP endpoint
*/}}
{{- define "dashfrog.otlpEndpoint" -}}
{{- if .Values.api.config.otlpEndpoint }}
{{- .Values.api.config.otlpEndpoint }}
{{- else if .Values.otelCollector.enabled }}
{{- printf "grpc://%s-otel-collector:4317" .Release.Name }}
{{- else }}
{{- fail "OTLP endpoint must be specified when otelCollector.enabled is false" }}
{{- end }}
{{- end }}

{{/*
Prometheus endpoint
*/}}
{{- define "dashfrog.prometheusEndpoint" -}}
{{- if .Values.api.config.prometheusEndpoint }}
{{- .Values.api.config.prometheusEndpoint }}
{{- else if .Values.prometheus.enabled }}
{{- printf "http://%s-prometheus-server:80" .Release.Name }}
{{- else }}
{{- fail "Prometheus endpoint must be specified when prometheus.enabled is false" }}
{{- end }}
{{- end }}

{{/*
Secret name
*/}}
{{- define "dashfrog.secretName" -}}
{{- if .Values.api.secrets.existingSecret }}
{{- .Values.api.secrets.existingSecret }}
{{- else }}
{{- printf "%s-secrets" (include "dashfrog.fullname" .) }}
{{- end }}
{{- end }}

{{/*
OTEL Collector name
*/}}
{{- define "dashfrog.otelCollector.fullname" -}}
{{- printf "%s-otel-collector" .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}
