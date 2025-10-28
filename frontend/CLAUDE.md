# Dashfrog Frontend - Development Guidelines

This file contains project-specific guidelines and conventions for the Dashfrog frontend application.

## Debugging

- When asked to debug an issue first explain fix plan to user and ask for confirmation. Do not proceed to fix without user confirmation.

## UI Framework

- Use **shadcn/ui** for basic components (e.g., Drawer, Dialog, Card, Button, etc.)
- Use **Tailwind v4 syntax** for styling

## TypeScript Type Organization

### Centralized Types (`/src/types/`)

Types should be centralized in `/src/types/` when they meet **ANY** of these criteria:

1. **Used across multiple files/components** - The type is imported and used in more than one place
2. **Represent core domain models** - Business entities like Label, Metric, Flow, Notebook
3. **Shared across different features** - Types that bridge multiple feature areas

**Important:** All centralized types follow JavaScript conventions (camelCase). Backend API response types (snake_case) are kept local in API service files and converted at the service boundary.

**Examples of centralized types:**
- `Label`, `Metric`, `Flow` - Core domain models (JavaScript conventions)
- `LabelsStore`, `MetricsStore` - Store structures accessed by multiple contexts/components
- `Filter`, `ApiFilter` - Shared filtering types
- `LabelUsage`, `MetricKind` - Supporting types used by domain models

### Local Types (Keep in Same File)

Types should stay **co-located** with their usage when they meet **ANY** of these criteria:

1. **Only used within a single file** - Type is not imported anywhere else
2. **Implementation details of a specific layer** - Internal to API services, contexts, or components
3. **Temporary or experimental** - Types that might change or be removed
4. **Backend API response types** - Raw types from backend (snake_case) that get converted at the service boundary

**Examples of local types:**
- `MetricApiResponse` in `metrics.ts` - Backend response type with snake_case, converted to `Metric` (camelCase)
- `LabelApiResponse` in `labels.ts` - Backend response type, converted at API boundary
- `PaginationParams` in `flows.ts` - Only used within that API service
- Component-specific prop interfaces - Only used in one component
- Internal state types - Only used within a context or hook

### Import Conventions

```typescript
// ✅ Recommended: Import from central index
import { Label, Metric, Flow } from '@/src/types'

// ✅ Also acceptable: Import from specific files
import type { Label } from '@/src/types/label'
import type { Metric } from '@/src/types/metric'

// ❌ Avoid: Don't centralize types only used in one place
// Keep them local instead
```

### Naming Conventions

- **Domain types**: Use singular form with JavaScript conventions (e.g., `Label`, `Metric`, `Flow`)
- **Store types**: Suffix with `Store` (e.g., `LabelsStore`, `MetricsStore`)
- **Input types**: Suffix with `Input` (e.g., `NotebookCreateInput`, `NotebookUpdateInput`)
- **Enum-like unions**: Use singular form (e.g., `MetricKind`, `FilterOperator`)
- **API response types** (local only): Suffix with `ApiResponse` (e.g., `MetricApiResponse`, `LabelApiResponse`)

### API Service Boundary Pattern

All API services should follow this pattern:

1. **Define local API response types** (snake_case from backend)
2. **Create conversion functions** (`toMetric()`, `toLabel()`) that transform snake_case to camelCase
3. **Export only JavaScript convention types** to the rest of the application

```typescript
// Example: metrics.ts
interface MetricApiResponse {
  display_as: string;  // backend snake_case
  // ...
}

function toMetric(apiMetric: MetricApiResponse): Metric {
  return {
    displayAs: apiMetric.display_as,  // converted to camelCase
    // ...
  };
}

// Everything after this uses Metric (camelCase)
```

This ensures:
- ✅ Single source of truth for domain types
- ✅ Backend format details stay in API services
- ✅ UI only works with JavaScript conventions
- ✅ Clean separation of concerns

## Context Organization

- Store data contexts in `/src/contexts/`
- Each context should manage a specific domain (labels, metrics, notebooks, etc.)
- Use `useCallback` for functions passed to context values to prevent unnecessary re-renders
- Fetch data at context initialization when needed throughout the app
