// Universal API Environment Variable Convenience Wrappers
// Optional layer that reads credentials from .env files
// Use these functions if you want automatic .env support, otherwise use the main universal-api.ts functions

import dotenv from 'dotenv';
import {
  fetchUniversalCanvasCourses,
  fetchUniversalCanvasAssignments,
  fetchUniversalGradescopeCourses,
  fetchUniversalGradescopeAssignments,
  fetchUniversalAllCourses,
  fetchUniversalAllAssignments,
  validateCanvasToken
} from './universal-api';
import { authenticateGradescope } from './gradescope-api';
import {
  UniversalAPIResponse,
  UniversalCourse,
  UniversalCourseList,
  UniversalAssignment
} from './universal-interfaces';

// Load environment variables
dotenv.config();

// =============================================
// CANVAS CONVENIENCE FUNCTIONS (.env)
// =============================================

/**
 * Fetch Canvas courses using CANVAS_API_TOKEN from .env
 */
export async function fetchCanvasCoursesFromEnv(
  filterTerm: string
): Promise<UniversalAPIResponse<UniversalCourse[]>> {
  const apiToken = process.env.CANVAS_API_TOKEN;
  if (!apiToken) {
    throw new Error('CANVAS_API_TOKEN not found in .env file. Please add it to your .env file.');
  }
  return fetchUniversalCanvasCourses(filterTerm, apiToken);
}

/**
 * Fetch Canvas assignments using CANVAS_API_TOKEN from .env
 */
export async function fetchCanvasAssignmentsFromEnv(
  courseId: string
): Promise<UniversalAPIResponse<UniversalAssignment[]>> {
  const apiToken = process.env.CANVAS_API_TOKEN;
  if (!apiToken) {
    throw new Error('CANVAS_API_TOKEN not found in .env file. Please add it to your .env file.');
  }
  return fetchUniversalCanvasAssignments(courseId, apiToken);
}

/**
 * Validate Canvas token from .env
 */
export async function validateCanvasTokenFromEnv(): Promise<boolean> {
  const apiToken = process.env.CANVAS_API_TOKEN;
  if (!apiToken) {
    throw new Error('CANVAS_API_TOKEN not found in .env file. Please add it to your .env file.');
  }
  return validateCanvasToken(apiToken);
}

// =============================================
// GRADESCOPE CONVENIENCE FUNCTIONS (.env)
// =============================================

/**
 * Fetch Gradescope courses using GRADESCOPE_EMAIL and GRADESCOPE_PASSWORD from .env
 */
export async function fetchGradescopeCoursesFromEnv(
  filterTerm?: string
): Promise<UniversalAPIResponse<UniversalCourseList>> {
  const email = process.env.GRADESCOPE_EMAIL;
  const password = process.env.GRADESCOPE_PASSWORD;
  
  if (!email || !password) {
    throw new Error('GRADESCOPE_EMAIL and GRADESCOPE_PASSWORD not found in .env file. Please add them to your .env file.');
  }
  
  return fetchUniversalGradescopeCourses(filterTerm, { email, password });
}

/**
 * Fetch Gradescope assignments using GRADESCOPE_EMAIL and GRADESCOPE_PASSWORD from .env
 */
export async function fetchGradescopeAssignmentsFromEnv(
  courseId: string
): Promise<UniversalAPIResponse<UniversalAssignment[]>> {
  const email = process.env.GRADESCOPE_EMAIL;
  const password = process.env.GRADESCOPE_PASSWORD;
  
  if (!email || !password) {
    throw new Error('GRADESCOPE_EMAIL and GRADESCOPE_PASSWORD not found in .env file. Please add them to your .env file.');
  }
  
  return fetchUniversalGradescopeAssignments(courseId, { email, password });
}

// =============================================
// COMBINED CONVENIENCE FUNCTIONS (.env)
// =============================================

/**
 * Fetch courses from both APIs using credentials from .env
 */
/**
 * Fetch assignments from multiple Canvas courses in parallel
 */
export async function fetchMultipleCanvasAssignmentsFromEnv(
  courseIds: string[]
): Promise<UniversalAPIResponse<{ [courseId: string]: UniversalAssignment[] }>> {
  const apiToken = process.env.CANVAS_API_TOKEN;
  if (!apiToken) {
    return {
      success: false,
      error: 'CANVAS_API_TOKEN not found in .env file. Please add it to your .env file.'
    };
  }

  try {
    // Back to parallel - sequential was much worse! Canvas can handle it.
    const assignmentPromises = courseIds.map(async (courseId) => {
      const start = performance.now();
      const response = await fetchUniversalCanvasAssignments(courseId, apiToken);
      const time = performance.now() - start;
      console.log(`   📚 Canvas course ${courseId}: ${(time / 1000).toFixed(2)}s`);
      return { courseId, response };
    });

    const results = await Promise.all(assignmentPromises);
    
    const assignments: { [courseId: string]: UniversalAssignment[] } = {};
    let hasErrors = false;
    let firstError = '';

    for (const { courseId, response } of results) {
      if (response.success) {
        assignments[courseId] = response.data;
      } else {
        hasErrors = true;
        if (!firstError) {
          firstError = response.error;
        }
        assignments[courseId] = [];
      }
    }

    if (hasErrors && Object.keys(assignments).length === 0) {
      return {
        success: false,
        error: firstError
      };
    }

    return {
      success: true,
      data: assignments
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Fetch assignments from multiple Gradescope courses using a single session
 */
export async function fetchMultipleGradescopeAssignmentsFromEnv(
  courseIds: string[]
): Promise<UniversalAPIResponse<{ [courseId: string]: UniversalAssignment[] }>> {
  const email = process.env.GRADESCOPE_EMAIL;
  const password = process.env.GRADESCOPE_PASSWORD;
  
  if (!email || !password) {
    return {
      success: false,
      error: 'GRADESCOPE_EMAIL and GRADESCOPE_PASSWORD not found in .env file. Please add them to your .env file.'
    };
  }

  try {
    // Authenticate once and reuse session
    const sessionCookies = await authenticateGradescope(email, password);
    
    // Increase Gradescope concurrency - it's been performing well
    const BATCH_SIZE = 8; // Increased from 3 to 8
    const results = [];
    
    for (let i = 0; i < courseIds.length; i += BATCH_SIZE) {
      const batch = courseIds.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (courseId) => {
        const response = await fetchUniversalGradescopeAssignments(courseId, { sessionCookies });
        return { courseId, response };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    const assignments: { [courseId: string]: UniversalAssignment[] } = {};
    let hasErrors = false;
    let firstError = '';

    for (const { courseId, response } of results) {
      if (response.success) {
        assignments[courseId] = response.data;
      } else {
        hasErrors = true;
        if (!firstError) {
          firstError = response.error;
        }
        assignments[courseId] = [];
      }
    }

    if (hasErrors && Object.keys(assignments).length === 0) {
      return {
        success: false,
        error: firstError
      };
    }

    return {
      success: true,
      data: assignments
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function fetchAllCoursesFromEnv(
  filterTerm: string
): Promise<UniversalAPIResponse<{
  canvas: UniversalCourse[];
  gradescope: UniversalCourseList;
}>> {
  const canvasToken = process.env.CANVAS_API_TOKEN;
  const gradescopeEmail = process.env.GRADESCOPE_EMAIL;
  const gradescopePassword = process.env.GRADESCOPE_PASSWORD;
  
  if (!canvasToken) {
    throw new Error('CANVAS_API_TOKEN not found in .env file. Please add it to your .env file.');
  }
  
  if (!gradescopeEmail || !gradescopePassword) {
    throw new Error('GRADESCOPE_EMAIL and GRADESCOPE_PASSWORD not found in .env file. Please add them to your .env file.');
  }
  
  return fetchUniversalAllCourses(filterTerm, canvasToken, { email: gradescopeEmail, password: gradescopePassword });
}

/**
 * Fetch assignments from both APIs using credentials from .env
 */
export async function fetchAllAssignmentsFromEnv(
  canvasCourseId: string,
  gradescopeCourseId: string
): Promise<UniversalAPIResponse<{
  canvas: UniversalAssignment[];
  gradescope: UniversalAssignment[];
}>> {
  const canvasToken = process.env.CANVAS_API_TOKEN;
  const gradescopeEmail = process.env.GRADESCOPE_EMAIL;
  const gradescopePassword = process.env.GRADESCOPE_PASSWORD;
  
  if (!canvasToken) {
    throw new Error('CANVAS_API_TOKEN not found in .env file. Please add it to your .env file.');
  }
  
  if (!gradescopeEmail || !gradescopePassword) {
    throw new Error('GRADESCOPE_EMAIL and GRADESCOPE_PASSWORD not found in .env file. Please add them to your .env file.');
  }
  
  return fetchUniversalAllAssignments(canvasCourseId, gradescopeCourseId, canvasToken, { email: gradescopeEmail, password: gradescopePassword });
}

// =============================================
// ENVIRONMENT VARIABLE VALIDATION
// =============================================

/**
 * Check if all required environment variables are set
 */
export function validateEnvironmentVariables(): {
  canvas: boolean;
  gradescope: boolean;
  missingVars: string[];
} {
  const canvasToken = process.env.CANVAS_API_TOKEN;
  const gradescopeEmail = process.env.GRADESCOPE_EMAIL;
  const gradescopePassword = process.env.GRADESCOPE_PASSWORD;
  
  const missingVars: string[] = [];
  
  if (!canvasToken) missingVars.push('CANVAS_API_TOKEN');
  if (!gradescopeEmail) missingVars.push('GRADESCOPE_EMAIL');
  if (!gradescopePassword) missingVars.push('GRADESCOPE_PASSWORD');
  
  return {
    canvas: !!canvasToken,
    gradescope: !!(gradescopeEmail && gradescopePassword),
    missingVars
  };
}

/**
 * Print helpful setup instructions for missing environment variables
 */
export function printEnvSetupInstructions(): void {
  const validation = validateEnvironmentVariables();
  
  if (validation.missingVars.length === 0) {
    console.log('✅ All environment variables are set correctly!');
    return;
  }
  
  console.log('❌ Missing environment variables in your .env file:');
  console.log('');
  
  validation.missingVars.forEach(varName => {
    console.log(`❌ ${varName}`);
  });
  
  console.log('');
  console.log('📋 Add these to your .env file:');
  console.log('');
  
  if (!validation.canvas) {
    console.log('# Canvas API Token (get from Canvas Settings → Account → New Access Token)');
    console.log('CANVAS_API_TOKEN=your_canvas_api_token_here');
    console.log('');
  }
  
  if (!validation.gradescope) {
    console.log('# Gradescope Login Credentials');
    console.log('GRADESCOPE_EMAIL=your_email@university.edu');
    console.log('GRADESCOPE_PASSWORD=your_gradescope_password');
    console.log('');
  }
  
  console.log('💡 Then restart your application to load the new environment variables.');
}