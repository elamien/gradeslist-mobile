# EdTech API Gateway Guide

## Overview

This EdTech API Gateway provides a unified interface for accessing multiple educational technology platforms through a single API. Instead of dealing with different field names, data types, and authentication methods across Canvas, Gradescope, and future EdTech platforms, you can use the gateway functions that handle all the complexity automatically.

## Key Benefits

✅ **Unified Interface**: One API to access all your EdTech platforms  
✅ **Automatic Field Mapping**: `due_at` vs `due_date` → all become `due_date`  
✅ **Type Normalization**: Canvas numbers → strings, Gradescope DateTime → ISO strings  
✅ **Authentication Handling**: Each platform's auth method handled automatically  
✅ **Error Handling**: Standardized error responses from all platforms  
✅ **Performance Optimization**: Caching, batching, and parallelization per platform  
✅ **Future-Proof**: Easy to add new EdTech platforms (Pearson, McGraw-Hill, Cengage, etc.)  

## Supported Platforms

### Current
- 🎨 **Canvas LMS** - REST API with Bearer token authentication
- 📝 **Gradescope** - Web scraping with session-based authentication

### Future Roadmap
- 📚 **Pearson MyLab** - Planned integration
- 📖 **McGraw-Hill Connect** - Planned integration  
- 🎓 **Cengage WebAssign** - Planned integration
- 🧮 **MathWorks** - Planned integration
- 🔬 **Other EdTech platforms** - Community contributions welcome

## File Structure

```
api-extraction/
├── universal-interfaces.ts    # Standardized data types
├── field-mapping.ts          # Platform-specific conversion functions
├── universal-api.ts          # Core gateway functions
├── universal-api-env.ts      # Environment variable convenience layer
├── canvas-api.ts             # Canvas platform adapter
├── gradescope-api.ts         # Gradescope platform adapter
├── example-usage.ts          # Demo script
├── .env.example              # Environment variable template
├── EDTECH-GATEWAY-GUIDE.md   # This guide
└── PERFORMANCE.md            # Performance optimization documentation
```

## Quick Start

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Add your credentials
CANVAS_API_TOKEN=your_canvas_token_here
GRADESCOPE_EMAIL=your_gradescope_email
GRADESCOPE_PASSWORD=your_gradescope_password
```

### 2. Basic Usage
```typescript
import { fetchAllCoursesFromEnv } from './universal-api-env';

// Get courses from ALL platforms with one call
const response = await fetchAllCoursesFromEnv('spring 2025');

if (response.success) {
  const { canvas, gradescope } = response.data;
  console.log(`Found ${canvas.length} Canvas courses`);
  console.log(`Found ${gradescope.student.length} Gradescope courses`);
}
```

### 3. Run the Demo
```bash
# From parent directory
npx tsx api-extraction/example-usage.ts

# Or from api-extraction directory  
npx tsx example-usage.ts
```

## API Gateway Functions

### Course Functions
```typescript
// Get courses from all platforms
fetchAllCoursesFromEnv(term: string)

// Get courses from specific platforms
fetchCanvasCoursesFromEnv(term: string)
fetchGradescopeCoursesFromEnv(term: string)
```

### Assignment Functions
```typescript
// Get assignments from all platforms
fetchAllAssignmentsFromEnv(canvasCourseId: string, gradescopeCourseId: string)

// Get assignments from specific platforms
fetchMultipleCanvasAssignmentsFromEnv(courseIds: string[])
fetchMultipleGradescopeAssignmentsFromEnv(courseIds: string[])
```

## Data Structures

### Universal Course
```typescript
interface UniversalCourse {
  id: string;           // Normalized to string
  name: string;         // Course name
  term: string;         // Academic term
  course_code?: string; // Course code (if available)
}
```

### Universal Assignment
```typescript
interface UniversalAssignment {
  id: string;           // Normalized to string
  title: string;        // Assignment title
  due_date: string | null;     // ISO date string
  max_points: number | null;   // Total points possible
  score: number | null;        // Student's score
  status: string;       // 'missing' | 'submitted' | 'graded'
}
```

## Authentication Methods

### Canvas Authentication
- **Method**: API Token (Bearer token)
- **How to get**: Canvas → Account → Settings → New Access Token
- **Usage**: Automatic when using `FromEnv` functions
- **Example**:
```typescript
const courses = await fetchCanvasCoursesFromEnv("spring 2025");
```

### Gradescope Authentication
- **Method**: Username/password (native) OR session cookies
- **How it works**: 
  - **Option 1**: Provide email/password, gateway handles login automatically
  - **Option 2**: Provide pre-authenticated session cookies
- **Usage**: Automatic when using `FromEnv` functions
- **Security**: Sessions expire naturally, no long-term credential storage
- **Examples**:
```typescript
// Option 1: Email/password (recommended)
const courses = await fetchGradescopeCoursesFromEnv("spring 2025");

// Option 2: Session cookies (advanced)
const courses = await fetchUniversalGradescopeCourses("spring 2025", { 
  sessionCookies: "your_session_cookies_here" 
});
```

## Gateway Functions

### Environment-Based Functions (Recommended)
```typescript
// Canvas functions
fetchCanvasCoursesFromEnv(term: string)
fetchCanvasAssignmentsFromEnv(courseId: string)

// Gradescope functions  
fetchGradescopeCoursesFromEnv(term?: string)
fetchGradescopeAssignmentsFromEnv(courseId: string)

// Combined functions
fetchAllCoursesFromEnv(term: string)
fetchAllAssignmentsFromEnv(canvasCourseId: string, gradescopeCourseId: string)
```

### Direct Functions (Advanced)
```typescript
// Canvas functions
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
```

## Examples

### Fetch All Courses
```typescript
import { fetchAllCoursesFromEnv } from './universal-api-env';

const response = await fetchAllCoursesFromEnv('spring 2025');

if (response.success) {
  const { canvas, gradescope } = response.data;
  
  // Canvas courses
  canvas.forEach(course => {
    console.log(`Canvas: ${course.name} (${course.id})`);
  });
  
  // Gradescope courses
  gradescope.student.forEach(course => {
    console.log(`Gradescope: ${course.name} (${course.id})`);
  });
}
```

### Fetch Assignments
```typescript
import { fetchMultipleCanvasAssignmentsFromEnv } from './universal-api-env';

const courseIds = ['123', '456', '789'];
const response = await fetchMultipleCanvasAssignmentsFromEnv(courseIds);

if (response.success) {
  Object.entries(response.data).forEach(([courseId, assignments]) => {
    console.log(`Course ${courseId}: ${assignments.length} assignments`);
    assignments.forEach(assignment => {
      console.log(`  - ${assignment.title}: ${assignment.status}`);
    });
  });
}
```

## Performance

The EdTech API Gateway is optimized for performance:

- **Canvas**: ~2.8s for 69 assignments across 4 courses
- **Gradescope**: ~0.8s for 29 assignments across 2 courses  
- **Parallel processing**: Multiple platforms fetch simultaneously
- **Caching**: Request-level caching with deduplication
- **Batching**: Optimized concurrency per platform

See [PERFORMANCE.md](./PERFORMANCE.md) for detailed optimization information.

## Error Handling

All gateway functions return a standardized response format:

```typescript
interface UniversalAPIResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  platform: string;
}
```

### Example Error Handling
```typescript
const response = await fetchCanvasCoursesFromEnv('spring 2025');

if (!response.success) {
  console.error(`Canvas error: ${response.error}`);
  // Handle Canvas-specific error
} else {
  // Process successful response
  console.log(`Found ${response.data.length} courses`);
}
```

## Best Practices

1. **Always use the gateway functions** instead of platform-specific APIs
2. **Check the `success` field** before using the data
3. **Use environment variables** for credentials (`.env` file)
4. **Handle errors gracefully** - platforms may have different availability
5. **Cache responses** when possible to reduce API calls
6. **Use batch functions** for multiple courses to improve performance

## Troubleshooting

### Common Issues

1. **Canvas API Token Invalid**
   - Check token is correct in `.env` file
   - Verify token has not expired
   - Ensure token has necessary permissions

2. **Gradescope Authentication Failed**
   - Check email/password in `.env` file
   - Try logging in manually to verify credentials
   - Check for account lockout or 2FA requirements

3. **No Courses Found**
   - Verify term format (e.g., "spring 2025")
   - Check if courses exist for that term
   - Ensure you're enrolled in courses for that term

4. **Performance Issues**
   - Use batch functions for multiple courses
   - Consider courses-only mode for faster results
   - Check network connection

### Getting Help

- Check [PERFORMANCE.md](./PERFORMANCE.md) for performance optimization
- Review example usage in `example-usage.ts`
- Verify environment setup with `.env.example`

## Contributing

### Adding New Platforms

1. Create platform adapter (e.g., `pearson-api.ts`)
2. Add field mapping functions
3. Update universal interfaces if needed
4. Add authentication handling
5. Update this guide

### Platform Requirements

- RESTful API or scrapeable web interface
- Course and assignment data available
- Authentication method (token, session, etc.)
- Reasonable performance (< 5s for typical loads)

---

**EdTech API Gateway** - One API, all your educational platforms 🎓