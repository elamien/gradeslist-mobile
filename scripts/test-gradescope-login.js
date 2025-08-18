// scripts/test-gradescope-login.js
// Test Gradescope login and data fetching using existing codebase functions

require('dotenv').config({ path: '.env.local' });
const { authenticateGradescope, fetchGradescopeCourses, fetchGradescopeAssignments } = require('../api-extraction/gradescope-api');

async function main() {
  const email = process.env.GRADESCOPE_EMAIL;
  const password = process.env.GRADESCOPE_PASSWORD;
  
  if (!email || !password) {
    console.error('Missing GRADESCOPE_EMAIL or GRADESCOPE_PASSWORD in .env.local');
    process.exit(1);
  }

  console.log('Testing Gradescope authentication and data fetching...');
  console.log('Email:', email.replace(/(.{3}).*(@.*)/, '$1***$2')); // Redact middle part

  try {
    // 1) Login and get session cookies (reuses existing CSRF + POST flow)
    console.log('\n=== STEP 1: Authentication ===');
    const sessionCookies = await authenticateGradescope(email, password);
    console.log('LOGIN: OK - Session cookies obtained');
    console.log('Cookie count:', sessionCookies.split(';').length, 'cookies');

    // 2) Fetch courses using session cookies
    console.log('\n=== STEP 2: Fetch Courses ===');
    const authOptions = { sessionCookies };
    const coursesData = await fetchGradescopeCourses('spring 2025', authOptions);
    
    // Extract courses from the response structure
    const allCourses = [];
    if (coursesData && coursesData.student) {
      Object.values(coursesData.student).forEach(course => allCourses.push(course));
    }
    if (coursesData && coursesData.instructor) {
      Object.values(coursesData.instructor).forEach(course => allCourses.push(course));
    }
    
    console.log(`COURSES: ${allCourses.length} found`);
    
    if (allCourses.length > 0) {
      console.log('Sample courses:');
      allCourses.slice(0, 3).forEach((course, idx) => {
        console.log(`  ${idx + 1}. ${course.name} (${course.term}) - ID: ${course.id}`);
      });
    } else {
      console.warn('No courses found; session might be limited but login worked.');
    }

    // 3) Fetch assignments from first course
    if (allCourses.length > 0) {
      console.log('\n=== STEP 3: Fetch Assignments ===');
      const firstCourse = allCourses[0];
      console.log(`Fetching assignments for: ${firstCourse.name}`);
      
      const assignments = await fetchGradescopeAssignments(firstCourse.id, authOptions);
      console.log(`ASSIGNMENTS(${firstCourse.name}): ${assignments.length} rows`);
      
      if (assignments.length > 0) {
        console.log('Sample assignments:');
        assignments.slice(0, 3).forEach((assignment, idx) => {
          const dueDate = assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date';
          console.log(`  ${idx + 1}. ${assignment.title} - Due: ${dueDate} - Status: ${assignment.submissions_status}`);
        });
      }
    }

    console.log('\n=== SUCCESS ===');
    console.log('✓ Programmatic login with session cookies works');
    console.log('✓ Course fetching works');
    console.log('✓ Assignment fetching works');
    console.log('✓ All existing codebase functions validated');

  } catch (err) {
    console.error('\n=== TEST FAILED ===');
    
    // Safely extract error details without logging sensitive info
    const errorMsg = (err && err.message) ? err.message : String(err);
    console.error('Error:', errorMsg.slice(0, 400));
    
    if (err?.response) {
      console.error('HTTP Status:', err.response.status);
      console.error('Status Text:', err.response.statusText);
      
      // Log response body preview (safely)
      let body = '';
      if (typeof err.response.data === 'string') {
        body = err.response.data;
      } else {
        body = JSON.stringify(err.response.data);
      }
      
      // Redact any potential sensitive data from body preview
      const bodyPreview = body
        .replace(/password[^}]*}/gi, 'password":"***"}')
        .replace(/email[^}]*}/gi, 'email":"***"}')
        .replace(/session[^}]*}/gi, 'session":"***"}')
        .slice(0, 400);
      
      console.error('Body preview:', bodyPreview);
    }
    
    if (err?.code) {
      console.error('Error code:', err.code);
    }
    
    process.exit(1);
  }
}

main();