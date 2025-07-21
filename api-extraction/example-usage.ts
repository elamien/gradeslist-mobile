// EdTech API Gateway Demo Script
// Run from parent directory: npx tsx api-extraction/example-usage.ts
// Or run from api-extraction directory: npx tsx example-usage.ts

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { performance } from 'perf_hooks';
import {
  fetchAllCoursesFromEnv,
  fetchCanvasCoursesFromEnv,
  fetchGradescopeCoursesFromEnv,
  fetchCanvasAssignmentsFromEnv,
  fetchGradescopeAssignmentsFromEnv,
  fetchMultipleCanvasAssignmentsFromEnv,
  fetchMultipleGradescopeAssignmentsFromEnv,
  validateEnvironmentVariables,
  printEnvSetupInstructions
} from './universal-api-env';

// Function to ask user for input
async function askForInput(query: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(query);
    return answer.trim();
  } finally {
    rl.close();
  }
}

// Function to validate and format term input
function formatTerm(termInput: string): string {
  const parts = termInput.trim().toLowerCase().split(/\s+/);
  
  if (parts.length !== 2) {
    throw new Error('Please enter term in format "season year" (e.g., "spring 2025")');
  }
  
  const [season, yearStr] = parts;
  
  // Validate season
  const validSeasons = ['spring', 'summer', 'fall', 'winter'];
  if (!validSeasons.includes(season)) {
    throw new Error(`Invalid season "${season}". Valid seasons: ${validSeasons.join(', ')}`);
  }
  
  // Validate year
  const yearNum = parseInt(yearStr);
  if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2030) {
    throw new Error(`Invalid year "${yearStr}". Please enter a year between 2020-2030.`);
  }
  
  // Return formatted term (e.g., "spring 2025")
  return `${season} ${yearStr}`;
}

async function main() {
  console.log('🎓 EdTech API Gateway Demo');
  console.log('===========================');
  console.log('');
  
  // Check environment variables
  console.log('📋 Checking environment variables...');
  const envValidation = validateEnvironmentVariables();
  
  if (envValidation.missingVars.length > 0) {
    console.log('');
    printEnvSetupInstructions();
    console.log('');
    console.log('❌ Please set up your .env file first, then run this script again.');
    process.exit(1);
  }
  
  console.log('✅ Environment variables configured correctly!');
  console.log('');
  
  // Get user input for term
  console.log('📅 Enter the academic term to search for:');
  
  const termInput = await askForInput('Term (e.g., "spring 2025"): ');
  
  // Get user input for demo type
  console.log('');
  console.log('🔧 Choose demo type:');
  console.log('1. Courses only (faster)');
  console.log('2. Courses + Assignments (slower, shows full functionality)');
  
  const demoType = await askForInput('Enter your choice (1 or 2): ');
  
  // Validate demo type
  if (demoType !== '1' && demoType !== '2') {
    console.error('❌ Invalid choice. Please enter 1 or 2.');
    process.exit(1);
  }
  
  const fetchAssignments = demoType === '2';
  
  let termFilter: string;
  try {
    termFilter = formatTerm(termInput);
    console.log(`🔍 Searching for courses in: "${termFilter}"`);
    if (fetchAssignments) {
      console.log('📋 Will also fetch assignments for found courses');
    }
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : 'Invalid input'}`);
    process.exit(1);
  }
  
  console.log('');
  const startTime = performance.now();
  
  // Performance tracking variables
  let courseFetchStart: number;
  let courseFetchEnd: number;
  let canvasAssignmentTime = 0;
  let gradescopeAssignmentTime = 0;
  let displayStartTime: number;
  let displayTime = 0;
  
  try {
    console.log('🚀 Fetching courses from both Canvas and Gradescope...');
    console.log('');
    
    // Fetch from both APIs with detailed timing
    courseFetchStart = performance.now();
    const allCoursesResponse = await fetchAllCoursesFromEnv(termFilter);
    courseFetchEnd = performance.now();
    
    console.log(`📊 Course fetching completed in ${((courseFetchEnd - courseFetchStart) / 1000).toFixed(2)}s`);
    
    if (!allCoursesResponse.success) {
      console.error(`❌ Error fetching courses: ${allCoursesResponse.error}`);
      process.exit(1);
    }
    
    const { canvas, gradescope } = allCoursesResponse.data;
    
    // Fetch all assignments in parallel if requested
    let canvasAssignments: { [courseId: string]: any[] } = {};
    let gradescopeAssignments: { [courseId: string]: any[] } = {};
    
    if (fetchAssignments) {
      const assignmentStartTime = performance.now();
      console.log('📋 Fetching assignments in parallel...');
      
      const assignmentPromises = [];
      
      // Fetch Canvas assignments in parallel
      if (canvas.length > 0) {
        const canvasStart = performance.now();
        console.log(`   🔍 Starting Canvas requests for ${canvas.length} courses...`);
        const canvasPromise = fetchMultipleCanvasAssignmentsFromEnv(canvas.map(c => c.id))
          .then(response => {
            canvasAssignmentTime = performance.now() - canvasStart;
            console.log(`   ✅ Canvas requests completed in ${(canvasAssignmentTime / 1000).toFixed(2)}s`);
            if (response.success) {
              canvasAssignments = response.data;
              const totalAssignments = Object.values(response.data).reduce((sum, assignments) => sum + assignments.length, 0);
              console.log(`   📊 Canvas fetched ${totalAssignments} assignments across ${canvas.length} courses`);
            }
          });
        assignmentPromises.push(canvasPromise);
      }
      
      // Fetch Gradescope assignments in parallel
      const allGradescopeCourseIds = [
        ...gradescope.student.map(c => c.id),
        ...gradescope.instructor.map(c => c.id)
      ];
      
      if (allGradescopeCourseIds.length > 0) {
        const gradescopeStart = performance.now();
        const gradescopePromise = fetchMultipleGradescopeAssignmentsFromEnv(allGradescopeCourseIds)
          .then(response => {
            gradescopeAssignmentTime = performance.now() - gradescopeStart;
            if (response.success) {
              gradescopeAssignments = response.data;
            }
          });
        assignmentPromises.push(gradescopePromise);
      }
      
      await Promise.all(assignmentPromises);
      
      const assignmentEndTime = performance.now();
      console.log(`✅ Assignment fetching completed in ${((assignmentEndTime - assignmentStartTime) / 1000).toFixed(2)}s`);
      console.log(`   📊 Canvas assignments: ${(canvasAssignmentTime / 1000).toFixed(2)}s`);
      console.log(`   📊 Gradescope assignments: ${(gradescopeAssignmentTime / 1000).toFixed(2)}s`);
      console.log('');
    }
    
    // Display Canvas results
    displayStartTime = performance.now();
    console.log('📚 CANVAS COURSES');
    console.log('==================');
    if (canvas.length === 0) {
      console.log(`No Canvas courses found for "${termFilter}"`);
    } else {
      console.log(`Found ${canvas.length} Canvas course(s):`);
      canvas.forEach((course, index) => {
        console.log(`  ${index + 1}. ${course.name}`);
        console.log(`     ID: ${course.id}`);
        console.log(`     Term: ${course.term}`);
        if (course.course_code) {
          console.log(`     Code: ${course.course_code}`);
        }
        
        // Show assignments if they were fetched
        if (fetchAssignments && canvasAssignments[course.id]) {
          const assignments = canvasAssignments[course.id];
          console.log(`     📋 Assignments (${assignments.length}):`);
          // Show top 3 most recent assignments
          const recentAssignments = assignments
            .sort((a, b) => {
              const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
              const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
              return dateB - dateA;
            })
            .slice(0, 3);
          
          recentAssignments.forEach((assignment, aIndex) => {
            console.log(`       ${aIndex + 1}. ${assignment.title} (${assignment.status})`);
            if (assignment.due_date) {
              console.log(`          Due: ${assignment.due_date}`);
            }
            if (assignment.score !== null && assignment.max_points !== null) {
              console.log(`          Score: ${assignment.score}/${assignment.max_points}`);
            }
          });
          if (assignments.length > 3) {
            console.log(`       ... and ${assignments.length - 3} more`);
          }
        }
        
        console.log('');
      });
    }
    
    // Display Gradescope results
    console.log('📝 GRADESCOPE COURSES');
    console.log('=====================');
    
    const totalGradescopeCourses = gradescope.student.length + gradescope.instructor.length;
    if (totalGradescopeCourses === 0) {
      console.log(`No Gradescope courses found for "${termFilter}"`);
    } else {
      if (gradescope.student.length > 0) {
        console.log(`Student courses (${gradescope.student.length}):`);
        gradescope.student.forEach((course, index) => {
          console.log(`  ${index + 1}. ${course.name}`);
          console.log(`     ID: ${course.id}`);
          console.log(`     Term: ${course.term}`);
          
          // Show assignments if they were fetched
          if (fetchAssignments && gradescopeAssignments[course.id]) {
            const assignments = gradescopeAssignments[course.id];
            console.log(`     📋 Assignments (${assignments.length}):`);
            // Show top 3 most recent assignments
            const recentAssignments = assignments
              .sort((a, b) => {
                const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
                const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
                return dateB - dateA;
              })
              .slice(0, 3);
            
            recentAssignments.forEach((assignment, aIndex) => {
              console.log(`       ${aIndex + 1}. ${assignment.title} (${assignment.status})`);
              if (assignment.due_date) {
                console.log(`          Due: ${assignment.due_date}`);
              }
              if (assignment.score !== null && assignment.max_points !== null) {
                console.log(`          Score: ${assignment.score}/${assignment.max_points}`);
              }
            });
            if (assignments.length > 3) {
              console.log(`       ... and ${assignments.length - 3} more`);
            }
          }
          
          console.log('');
        });
      }
      
      if (gradescope.instructor.length > 0) {
        console.log(`Instructor courses (${gradescope.instructor.length}):`);
        gradescope.instructor.forEach((course, index) => {
          console.log(`  ${index + 1}. ${course.name}`);
          console.log(`     ID: ${course.id}`);
          console.log(`     Term: ${course.term}`);
          
          // Show assignments if they were fetched
          if (fetchAssignments && gradescopeAssignments[course.id]) {
            const assignments = gradescopeAssignments[course.id];
            console.log(`     📋 Assignments (${assignments.length}):`);
            // Show top 3 most recent assignments
            const recentAssignments = assignments
              .sort((a, b) => {
                const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
                const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
                return dateB - dateA;
              })
              .slice(0, 3);
            
            recentAssignments.forEach((assignment, aIndex) => {
              console.log(`       ${aIndex + 1}. ${assignment.title} (${assignment.status})`);
              if (assignment.due_date) {
                console.log(`          Due: ${assignment.due_date}`);
              }
              if (assignment.score !== null && assignment.max_points !== null) {
                console.log(`          Score: ${assignment.score}/${assignment.max_points}`);
              }
            });
            if (assignments.length > 3) {
              console.log(`       ... and ${assignments.length - 3} more`);
            }
          }
          
          console.log('');
        });
      }
    }
    
    // Summary
    const displayEndTime = performance.now();
    displayTime = (displayEndTime - displayStartTime) / 1000;
    
    console.log('📊 SUMMARY');
    console.log('===========');
    console.log(`Canvas courses: ${canvas.length}`);
    console.log(`Gradescope courses: ${totalGradescopeCourses}`);
    console.log(`Total courses: ${canvas.length + totalGradescopeCourses}`);
    
    // Assignment count summary
    if (fetchAssignments) {
      const totalCanvasAssignments = Object.values(canvasAssignments).reduce((sum, assignments) => sum + assignments.length, 0);
      const totalGradescopeAssignments = Object.values(gradescopeAssignments).reduce((sum, assignments) => sum + assignments.length, 0);
      console.log(`Canvas assignments: ${totalCanvasAssignments}`);
      console.log(`Gradescope assignments: ${totalGradescopeAssignments}`);
      console.log(`Total assignments: ${totalCanvasAssignments + totalGradescopeAssignments}`);
    }
    
  } catch (error) {
    console.error('❌ Error occurred:');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    console.log('');
    console.log('💡 Common issues:');
    console.log('  - Check your Canvas API token is valid');
    console.log('  - Check your Gradescope credentials are correct');
    console.log('  - Make sure you have internet connection');
    console.log('  - Try a different term format (e.g., "spring 2025" in one line)');
    console.log('  - If assignments are failing, try courses-only mode (option 1)');
  }
  
  const endTime = performance.now();
  const totalTime = (endTime - startTime) / 1000;
  
  console.log('');
  console.log('📊 DETAILED PERFORMANCE BREAKDOWN');
  console.log('==================================');
  
  const courseTime = (courseFetchEnd - courseFetchStart) / 1000;
  console.log(`🔍 Course fetching: ${courseTime.toFixed(2)}s (${((courseTime / totalTime) * 100).toFixed(1)}%)`);
  
  if (fetchAssignments) {
    const assignmentTime = (canvasAssignmentTime + gradescopeAssignmentTime) / 1000;
    console.log(`📋 Assignment fetching: ${assignmentTime.toFixed(2)}s (${((assignmentTime / totalTime) * 100).toFixed(1)}%)`);
    console.log(`   📚 Canvas: ${(canvasAssignmentTime / 1000).toFixed(2)}s`);
    console.log(`   📝 Gradescope: ${(gradescopeAssignmentTime / 1000).toFixed(2)}s`);
  }
  
  console.log(`💻 Display processing: ${displayTime.toFixed(2)}s (${((displayTime / totalTime) * 100).toFixed(1)}%)`);
  
  const networkTime = courseTime + (fetchAssignments ? (canvasAssignmentTime + gradescopeAssignmentTime) / 1000 : 0);
  const processingTime = Math.max(0, totalTime - networkTime); // Ensure non-negative
  const actualNetworkPercentage = Math.min(100, (networkTime / totalTime) * 100); // Cap at 100%
  
  console.log(`🌐 Network I/O: ${networkTime.toFixed(2)}s (${actualNetworkPercentage.toFixed(1)}%)`);
  console.log(`⚙️  Processing: ${processingTime.toFixed(2)}s (${((processingTime / totalTime) * 100).toFixed(1)}%)`);
  console.log('');
  console.log(`⏱️  Total execution time: ${totalTime.toFixed(2)} seconds`);
  console.log('');
  console.log('✨ Demo completed!');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('👋 Demo cancelled by user');
  process.exit(0);
});

// Run the demo
main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});