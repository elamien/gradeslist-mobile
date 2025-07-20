# API Extraction - Canvas & Gradescope

This directory contains the extracted core data structures and functions from the two main APIs in the gradeslist-v2 project, **now with a standardized universal API system**.

## 🚀 Quick Start (Use These!)

### Universal API Functions (Recommended)
- **`universal-api.ts`** - **"Plug and chug" wrapper functions** that provide consistent interface
- **`universal-api-env.ts`** - **Optional .env convenience wrappers** (decoupled from main API)
- **`universal-interfaces.ts`** - **Standardized data types** for all APIs
- **`field-mapping.ts`** - **Automatic conversion functions** between API formats

### Documentation
- **`UNIVERSAL-API-GUIDE.md`** - **Complete guide** for using the standardized system (includes field mapping reference)

## ✅ What's Been Standardized

### Field Names
- `due_at` vs `due_date` → **all become `due_date`**
- `name` vs `title` → **all become `title`**
- `points_possible` vs `points` → **all become `max_points`**
- `workflow_state` vs `submissions_status` → **all become `status`**

### Data Types  
- Canvas numbers → **strings** (IDs)
- Gradescope DateTime objects → **ISO strings** (dates)
- Gradescope string points → **numbers** (scores)

### Usage Example
```typescript
// MAIN API - Pass credentials directly
const canvasCourses = await fetchUniversalCanvasCourses(term, "canvas-token");
const gradescopeCourses = await fetchUniversalGradescopeCourses(term, { email, password });

// CONVENIENCE API - Reads from .env automatically
const canvasCourses = await fetchCanvasCoursesFromEnv(term);
const gradescopeCourses = await fetchGradescopeCoursesFromEnv(term);
```

## Files Structure

### Original API Files (Reference Only)
- **`canvas-api.ts`** - Canvas API core data structures and functions
- **`gradescope-api.ts`** - Gradescope API core data structures and functions

### Universal System (Use These!)
- **`universal-api.ts`** - Main functions you should use
- **`universal-api-env.ts`** - Convenience functions that read from .env
- **`universal-interfaces.ts`** - Standardized data types
- **`field-mapping.ts`** - Conversion between formats

## API Summary

### Canvas API
- **Type**: REST API with Bearer token authentication
- **Base URL**: `https://canvas.its.virginia.edu`
- **Original Format**: Numbers, `due_at`, `name`, `points_possible`
- **Universal Format**: Strings, `due_date`, `title`, `max_points`

### Gradescope API  
- **Type**: Web scraping with session cookies
- **Base URL**: `https://www.gradescope.com`
- **Original Format**: DateTime objects, `due_date`, `title`, `points`
- **Universal Format**: ISO strings, `due_date`, `title`, `max_points`

## Key Benefits

✅ **Same interface** for both APIs  
✅ **Automatic field mapping** (no more remembering different field names)  
✅ **Type normalization** (consistent data types)  
✅ **Error handling** (standardized error responses)  
✅ **Plug and chug** (use same functions regardless of API)  

## Migration

Instead of using the original API functions, use the universal ones:

```typescript
// ❌ OLD - inconsistent formats
import { fetchCanvasCourses } from './canvas-api';
import { fetchGradescopeCourses } from './gradescope-api';

// ✅ NEW - consistent format (main API)
import { fetchUniversalCanvasCourses, fetchUniversalGradescopeCourses } from './universal-api';

// ✅ NEW - .env convenience (optional)
import { fetchCanvasCoursesFromEnv, fetchGradescopeCoursesFromEnv } from './universal-api-env';
```

## Environment Variables Setup

To use the convenience `.env` functions, add these to your `.env` file:

```bash
# Canvas API Token (get from Canvas Settings → Account → New Access Token)
CANVAS_API_TOKEN=your_canvas_api_token_here

# Gradescope Login Credentials  
GRADESCOPE_EMAIL=your_email@university.edu
GRADESCOPE_PASSWORD=your_gradescope_password
```

**👉 See `UNIVERSAL-API-GUIDE.md` for complete usage instructions!**