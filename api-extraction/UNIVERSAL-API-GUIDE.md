# Universal API Guide

## Overview

This standardized API system provides a consistent interface for accessing both Canvas and Gradescope APIs. Instead of dealing with different field names, data types, and formats, you can use the universal functions that handle all the conversion automatically.

## Key Benefits

✅ **Consistent Data Format**: All APIs return the same data structure  
✅ **Automatic Field Mapping**: `due_at` vs `due_date` → all become `due_date`  
✅ **Type Normalization**: Canvas numbers → strings, Gradescope DateTime → ISO strings  
✅ **Error Handling**: Standardized error responses from all APIs  
✅ **Plug and Chug**: Use the same functions regardless of the underlying API  

## File Structure

```
api-extraction/
├── universal-interfaces.ts    # Standardized data types
├── field-mapping.ts          # Conversion functions
├── universal-api.ts          # "Plug and chug" wrapper functions
├── canvas-api.ts             # Original Canvas API functions
├── gradescope-api.ts         # Original Gradescope API functions
└── UNIVERSAL-API-GUIDE.md    # This guide
```

## Quick Start

### 1. Fetch Courses (Universal Format)

```typescript
import { fetchUniversalCanvasCourses, fetchUniversalGradescopeCourses } from './universal-api';

// Get Canvas courses in universal format
const canvasCourses = await fetchUniversalCanvasCourses("spring 2025", "your-canvas-token");

// Get Gradescope courses in universal format (using email/password)
const gradescopeCourses = await fetchUniversalGradescopeCourses("spring 2025", {
  email: "student@university.edu",
  password: "student_password"
});

// Both return the same structure:
// {
//   data: UniversalCourse[],
//   source: 'canvas' | 'gradescope',
//   success: boolean,
//   timestamp: string,
//   error?: string
// }
```

### 2. Fetch Assignments (Universal Format)

```typescript
import { fetchUniversalCanvasAssignments, fetchUniversalGradescopeAssignments } from './universal-api';

// Get Canvas assignments in universal format
const canvasAssignments = await fetchUniversalCanvasAssignments("123", "your-canvas-token");

// Get Gradescope assignments in universal format (using email/password)
const gradescopeAssignments = await fetchUniversalGradescopeAssignments("456", {
  email: "student@university.edu", 
  password: "student_password"
});

// Both return the same structure with standardized fields
```

### 3. Fetch from Both APIs at Once

```typescript
import { fetchUniversalAllCourses, fetchUniversalAllAssignments } from './universal-api';

// Get courses from both APIs
const allCourses = await fetchUniversalAllCourses(
  "spring 2025",
  "canvas-token",
  { email: "student@university.edu", password: "student_password" }
);

// Get assignments from both APIs
const allAssignments = await fetchUniversalAllAssignments(
  "canvas-course-id",
  "gradescope-course-id", 
  "canvas-token",
  { email: "student@university.edu", password: "student_password" }
);
```

## Universal Data Structures

### UniversalAssignment

```typescript
interface UniversalAssignment {
  id: string;                    // Always string (Canvas number → string)
  title: string;                 // Always "title" (Canvas "name" → "title")
  due_date: string | null;       // Always ISO string (Gradescope DateTime → string)
  max_points: number | null;     // Always number (Gradescope string → number)
  score: number | null;          // Points earned
  status: string;                // Standardized status values (missing/submitted/graded)
}
```

### UniversalCourse

```typescript
interface UniversalCourse {
  id: string;                    // Always string
  name: string;                  // Course name
  term: string;                  // Term name (Canvas term.name → term)
  course_code?: string;          // Optional (only Canvas has this)
}
```

## Field Mapping Examples

### Before (Raw APIs)
```typescript
// Canvas Assignment
{
  id: 123,                       // number
  name: "Homework 1",            // "name"
  due_at: "2024-12-15T23:59:59Z", // "due_at"
  points_possible: 100,          // "points_possible"
  submission: {
    score: 85,
    workflow_state: "submitted"
  }
}

// Gradescope Assignment  
{
  id: "456",                     // string
  title: "Homework 1",           // "title"
  due_date: DateTime.object,     // DateTime object
  points: "100",                 // string
  grade: 85,                     // "grade"
  submissions_status: "Submitted"
}
```

### After (Universal Format)
```typescript
// Both become:
{
  id: "123",                     // string
  title: "Homework 1",           // "title"
  due_date: "2024-12-15T23:59:59Z", // "due_date" as ISO string
  max_points: 100,               // "max_points" as number
  score: 85,                     // "score"
  status: "submitted"            // standardized status (missing/submitted/graded)
}
```

## Status Mapping (MVP: 3 States Only)

The universal system normalizes all status values to just 3 states:

- `UniversalAssignmentStatus.MISSING` → "missing" (no submission)
- `UniversalAssignmentStatus.SUBMITTED` → "submitted" (submitted but not graded)
- `UniversalAssignmentStatus.GRADED` → "graded" (graded)

### Canvas Status Mapping:
- `null`, `"unsubmitted"` → **MISSING**
- `"submitted"`, `"pending_review"` → **SUBMITTED**
- `"graded"` → **GRADED**

### Gradescope Status Mapping:
- `"Not submitted"`, `"missing"` → **MISSING**
- `"Submitted"`, `"Submitted (Late)"` → **SUBMITTED**
- `"Graded"`, `"Graded (Late)"` → **GRADED**

## Field Mapping Reference

This shows exactly how fields from each API are converted to the universal format.

### Canvas API → Universal:
```
id (number)              → id (string)
name                     → title
due_at (ISO string)      → due_date (ISO string)
points_possible (number) → max_points (number)
submission.score         → score (number)
workflow_state          → status (missing/submitted/graded)
```

### Gradescope API → Universal:
```
id (string)                    → id (string)
title                          → title
due_date (DateTime object)     → due_date (ISO string)
points (string)                → max_points (number)
grade (number)                 → score (number)
submissions_status             → status (missing/submitted/graded)
```

### Key Conversions:
- **Canvas numbers → strings** (for IDs)
- **Gradescope DateTime → ISO strings** (for dates)
- **Gradescope string points → numbers** (for max_points)
- **All status values → 3 standard states** (missing/submitted/graded)

## Authentication (MVP - Temporary Approach)

> ⚠️ **Note**: Current authentication is a temporary MVP implementation. We plan to improve and standardize this in future versions.

### Current Authentication Methods:

#### Canvas API:
- **Method**: User-provided API tokens
- **How to get**: Canvas Settings → Account → "New Access Token"
- **Usage**: Pass token as string parameter to all Canvas functions
- **Security**: Tokens can be scoped and revoked by users
- **Example**:
```typescript
const canvasToken = "your_canvas_api_token_here";
const courses = await fetchUniversalCanvasCourses("spring 2025", canvasToken);
```

#### Gradescope API:
- **Method**: Username/password (native) OR session cookies
- **How it works**: 
  - **Option 1**: Provide email/password, system handles login automatically
  - **Option 2**: Provide pre-authenticated session cookies
- **Usage**: Pass auth options object to all Gradescope functions
- **Security**: Sessions expire naturally, no long-term credential storage
- **Examples**:
```typescript
// Option 1: Email/password (recommended - native auth method)
const courses = await fetchUniversalGradescopeCourses("spring 2025", {
  email: "student@university.edu",
  password: "student_password"
});

// Option 2: Session cookies (if you already have them)
const courses = await fetchUniversalGradescopeCourses("spring 2025", {
  sessionCookies: "session_cookies_string"
});
```

### Why Different Auth Methods?

- **Canvas**: Provides official API with token-based authentication
- **Gradescope**: No official API, requires web scraping with session-based authentication
- **Current approach**: Each API uses its native authentication method

### Authentication in Universal Functions:

All universal functions require authentication parameters:

```typescript
// Canvas functions require API token
fetchUniversalCanvasCourses(term: string, apiToken: string)
fetchUniversalCanvasAssignments(courseId: string, apiToken: string)

// Gradescope functions support both auth methods
fetchUniversalGradescopeCourses(
  term?: string, 
  authOptions?: { email: string; password: string } | { sessionCookies: string }
)
fetchUniversalGradescopeAssignments(
  courseId: string, 
  authOptions?: { email: string; password: string } | { sessionCookies: string }
)

// Combined functions
fetchUniversalAllCourses(
  term: string, 
  canvasApiToken: string, 
  gradescopeAuthOptions?: { email: string; password: string } | { sessionCookies: string }
)
```

### Future Improvements Planned:

1. **Unified authentication wrapper** - Single interface for both APIs
2. **Session management** - Automatic token/session refresh
3. **Better security** - Enhanced credential handling
4. **OAuth integration** - If/when APIs support it

### Security Notes:

- ✅ **No credential storage** - Library never stores tokens/passwords
- ✅ **Pass-through only** - Credentials passed directly to APIs
- ✅ **User controlled** - Users manage their own tokens/sessions
- ⚠️ **Temporary sessions** - Gradescope sessions expire and need renewal

## Error Handling

All universal functions return a standardized response:

```typescript
{
  data: T,                       // The actual data
  source: 'canvas' | 'gradescope',
  timestamp: string,             // When the request was made
  success: boolean,              // Whether it succeeded
  error?: string                 // Error message if failed
}
```

## Utility Functions

```typescript
// Validate Canvas token
const isValid = await validateCanvasToken("your-token");

// Merge assignments from both APIs
const merged = mergeUniversalAssignments(canvasAssignments, gradescopeAssignments);

// Filter by status
const submitted = filterAssignmentsByStatus(assignments, "submitted");
const missing = filterAssignmentsByStatus(assignments, "missing");
const graded = filterAssignmentsByStatus(assignments, "graded");

// Filter by due date range
const upcoming = filterAssignmentsByDueDate(assignments, "2024-12-01", "2024-12-31");
```

## Migration Guide

### From Original APIs:
```typescript
// OLD WAY - dealing with different formats
const canvasCourses = await fetchCanvasCourses(term, token);
const gradescopeCourses = await fetchGradescopeCourses(term, cookies);

// Manual conversion needed
const standardized = canvasCourses.map(course => ({
  id: course.id.toString(),
  title: course.name,
  // ... more manual mapping
}));
```

### To Universal API:
```typescript
// NEW WAY - consistent format automatically
const canvasCourses = await fetchUniversalCanvasCourses(term, token);
const gradescopeCourses = await fetchUniversalGradescopeCourses(term, cookies);

// Both already in the same format!
// canvasCourses.data and gradescopeCourses.data have identical structure
```

## Best Practices

1. **Always use the Universal API functions** instead of the original API functions
2. **Check the `success` field** before using the data
3. **Use the utility functions** for common operations like filtering
4. **Handle errors gracefully** using the standardized error format
5. **Use TypeScript** to get full type safety with the universal interfaces

This system eliminates the need to remember different field names, data types, and formats across APIs!