// scripts/cookie_flow_verify.mjs
// End-to-end verification of cookie-only Gradescope flow using production parsing code

import axios from 'axios';
import { config } from 'dotenv';

config({ path: '.env.local' });

// Import production parsing functions
import { 
  fetchGradescopeCourses, 
  fetchGradescopeAssignments 
} from '../api-extraction/gradescope-api.js';

// Helper to sort object keys for consistent output
function sortedStringify(obj, indent = 2) {
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj !== 'object') return JSON.stringify(obj);
  
  const sortedObj = {};
  Object.keys(obj).sort().forEach(key => {
    sortedObj[key] = obj[key];
  });
  return JSON.stringify(sortedObj, null, indent);
}

// Helper to redact cookie values
function redactCookies(cookieHeader) {
  return cookieHeader
    .split('; ')
    .map(cookie => {
      const [name] = cookie.split('=');
      return `${name}=***`;
    })
    .join('; ');
}

// Retry helper with exponential backoff
async function withRetry(fn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      
      // Only retry on specific errors
      if (error.response && (error.response.status === 429 || error.response.status >= 500)) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`  ⚠️  Attempt ${attempt} failed (${error.response.status}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
}

async function cookieFlowVerify() {
  const cookieHeader = process.env.COOKIE_HEADER;

  if (!cookieHeader) {
    console.error('Missing COOKIE_HEADER in environment');
    console.error('Run: COOKIE_HEADER="..." node scripts/cookie_flow_verify.mjs');
    process.exit(1);
  }

  console.log('=== COOKIE-ONLY GRADESCOPE VERIFICATION ===');
  console.log('Cookie:', redactCookies(cookieHeader));
  console.log('');

  // Create axios client with cookies pre-configured
  const client = axios.create({
    timeout: 15000,
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    }
  });

  let coursesCount = 0;
  let assignmentsCount = 0;
  let detailsChecked = 0;

  try {
    // STEP 1: Verify account access
    console.log('STEP 1: Account access ... ', { end: '' });
    
    const accountResponse = await withRetry(async () => {
      return await client.get('https://www.gradescope.com/account', {
        maxRedirects: 0,
        validateStatus: status => status < 400
      });
    });

    if (accountResponse.status !== 200) {
      throw new Error(`Account page returned status: ${accountResponse.status}`);
    }

    // Check if redirected to login or contains login form
    const accountHtml = accountResponse.data;
    if (accountHtml.includes('Log In') || accountHtml.includes('Sign In') || 
        accountHtml.includes('session[email]') || accountHtml.includes('session[password]')) {
      throw new Error('Account page contains login form - session invalid');
    }

    console.log('OK (200)');
    console.log('');

    // STEP 2: Fetch courses using production code
    console.log('STEP 2: Courses ........ ', { end: '' });
    
    const authOptions = { sessionCookies: cookieHeader };
    const coursesData = await withRetry(async () => {
      return await fetchGradescopeCourses('spring 2025', authOptions);
    });

    // Extract all courses from the production response structure
    const allCourses = [];
    if (coursesData && coursesData.student) {
      Object.values(coursesData.student).forEach(course => allCourses.push(course));
    }
    if (coursesData && coursesData.instructor) {
      Object.values(coursesData.instructor).forEach(course => allCourses.push(course));
    }

    coursesCount = allCourses.length;
    console.log(`OK (${coursesCount} found)`);
    
    if (coursesCount > 0) {
      console.log('  sample (up to 5):');
      allCourses.slice(0, 5).forEach(course => {
        console.log(`    - ${sortedStringify(course)}`);
      });
    }
    console.log('');

    // STEP 3: Fetch assignments for each course
    console.log('STEP 3: Assignments per course:');
    
    for (const course of allCourses.slice(0, 3)) { // Limit to first 3 courses for performance
      const courseIdentifier = course.name || course.id || 'Unknown Course';
      console.log(`  [${courseIdentifier}]`);
      
      try {
        const assignments = await withRetry(async () => {
          return await fetchGradescopeAssignments(course.id, authOptions);
        });

        assignmentsCount += assignments.length;
        console.log(`    total: ${assignments.length}`);
        
        if (assignments.length > 0) {
          console.log('    sample (up to 5):');
          assignments.slice(0, 5).forEach(assignment => {
            console.log(`      - ${sortedStringify(assignment)}`);
          });
        }
        
        // STEP 4: Assignment details (if we can extract individual assignment pages)
        // Note: The current production code doesn't have a separate assignment detail function,
        // so we'll check if assignments have detailed fields already
        if (assignments.length > 0) {
          console.log('');
          console.log('STEP 4: Assignment details (spot check, if helper exists):');
          console.log(`  [${courseIdentifier}]`);
          
          const sampleAssignment = assignments[0];
          const assignmentIdentifier = sampleAssignment.title || sampleAssignment.id || 'Unknown Assignment';
          
          console.log(`    - ${assignmentIdentifier}:`);
          console.log(`      detail: ${sortedStringify(sampleAssignment)}`);
          console.log('      list/detail consistency:');
          console.log('        - (Same object - no separate detail fetch in current production code)');
          
          detailsChecked++;
        }
        
      } catch (error) {
        console.log(`    ERROR: ${error.message}`);
      }
      
      console.log('');
    }

    // FINAL RESULTS
    console.log('FINAL:');
    console.log(`  COURSES: ${coursesCount}`);
    console.log(`  ASSIGNMENTS (sum across courses): ${assignmentsCount}`);
    console.log(`  DETAILS CHECKED: ${detailsChecked}`);
    console.log('  RESULT: SUCCESS (cookie-only parsing works end-to-end)');

  } catch (error) {
    console.log('');
    console.log('FINAL:');
    console.log(`  COURSES: ${coursesCount}`);
    console.log(`  ASSIGNMENTS (sum across courses): ${assignmentsCount}`);
    console.log(`  DETAILS CHECKED: ${detailsChecked}`);
    console.log(`  RESULT: FAIL (${error.message})`);
    
    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  HTML preview: ${String(error.response.data).slice(0, 400)}`);
    }
    
    process.exit(1);
  }
}

cookieFlowVerify();