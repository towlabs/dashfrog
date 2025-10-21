# Types Directory

This directory contains all centralized TypeScript type definitions for the Dashfrog frontend application.

## Organization

Types are organized by domain/feature:

### Filter Types (`filter.ts`)
Types related to filtering and querying:
- `FilterOperator` - Supported filter operations
- `Filter` - Frontend filter structure
- `ApiFilter` - Backend API filter format

### Flow Types (`flow.ts`)
Workflow/trace-related types:
- `Flow` - Represents a workflow execution trace

### Label Types (`label.ts`)
Label metadata types (JavaScript conventions):
- `Label` - Canonical label type used throughout the application (camelCase)
- `LabelUsage` - Where and how a label is used
- `LabelsStore` - Indexed label store for fast lookups

**Note:** Raw backend API types (snake_case) are kept local in `services/api/labels.ts`

### Metric Types (`metric.ts`)
Metrics and measurement types (JavaScript conventions):
- `Metric` - Canonical metric type used throughout the application (camelCase)
- `MetricKind` - Prometheus metric types (counter, gauge, etc.)
- `MetricsStore` - Indexed metric store for fast lookups

**Note:** Raw backend API types (snake_case) are kept local in `services/api/metrics.ts`

### Notebook Types (`notebook.ts`)
Notebook and time window types:
- `NotebookData` - Notebook structure
- `TimeWindowConfig` - Relative or absolute time ranges
- `RelativeTimeValue` - Predefined time ranges
- `NotebookCreateInput` / `NotebookUpdateInput` - API input types

### Step Types (`step.ts`)
Workflow step types:
- `Step` - Individual workflow step data

## Usage

### Import from centralized index
```typescript
// Recommended: Import from index for consistency
import { Label, Metric, PaginatedResponse } from '@/src/types'
```

### Import from specific files
```typescript
// Alternative: Import directly from specific files
import type { Label } from '@/src/types/label'
import type { Metric } from '@/src/types/metric'
```

## Guidelines

### When to Add Types Here

Types should be centralized in this directory when they:
1. Are used in multiple files/components
2. Represent core domain models (Label, Metric, Flow, etc.) in **JavaScript conventions**
3. Are shared across different features

**Important:** All centralized types use JavaScript naming conventions (camelCase). Backend API response types (snake_case) are kept local in API service files.

### When NOT to Add Types Here

Keep types local (in the same file) when they:
1. Are only used in a single component
2. Are implementation details of a specific feature
3. Are temporary or experimental
4. **Are backend API response types** (e.g., `MetricApiResponse`, `LabelApiResponse` with snake_case)
5. **Are only used within API services** (e.g., `PaginationParams` in `flows.ts`)

### Best Practices

1. **Document your types**: Add JSDoc comments explaining what each type represents
2. **Use semantic names**: Type names should clearly indicate what they represent
3. **Keep it DRY**: Reuse common types instead of duplicating them
4. **Prefer type over interface** for simple types
5. **Use interface for objects** that might be extended
6. **Export types explicitly**: Use `export type` for type-only exports

### Naming Conventions

- **Domain types**: Use singular form with JavaScript conventions (e.g., `Label`, `Metric`, `Flow`)
- **Store types**: Suffix with `Store` (e.g., `LabelsStore`, `MetricsStore`)
- **Input types**: Suffix with `Input` (e.g., `NotebookCreateInput`)
- **Enum-like unions**: Use singular form (e.g., `MetricKind`, `FilterOperator`)
- **API response types** (local only): Suffix with `ApiResponse` (e.g., `MetricApiResponse`)

## Maintenance

When modifying types:
1. Update relevant JSDoc comments
2. Check for breaking changes in dependent files
3. Run `npm run lint` to verify changes
4. Update this README if adding new type files
