const dotenv = require('dotenv');
const readline = require('readline');
const { fetchGradescopeCourses, fetchGradescopeAssignments } = require('./api-extraction/gradescope-api');

// Load environment variables from test-due-dates.env
dotenv.config({ path: './test-due-dates.env' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  try {
    console.log('🔍 Fetching Gradescope courses...\n');

    const email = process.env.GRADESCOPE_EMAIL;
    const password = process.env.GRADESCOPE_PASSWORD;

    if (!email || !password) {
      console.error('❌ Missing GRADESCOPE_EMAIL or GRADESCOPE_PASSWORD in test-due-dates.env');
      process.exit(1);
    }

    // Ask for term filter
    const termFilter = await askQuestion('Enter term to filter by (e.g., "Spring 2025", or press Enter for all): ');
    
    // Fetch courses
    const courses = await fetchGradescopeCourses(termFilter || undefined, { email, password });
    
    // Combine all courses into a single list for selection
    const allCourses = [];
    Object.entries(courses.student).forEach(([id, course]) => {
      allCourses.push({ id, ...course, role: 'Student' });
    });
    Object.entries(courses.instructor).forEach(([id, course]) => {
      allCourses.push({ id, ...course, role: 'Instructor' });
    });

    if (allCourses.length === 0) {
      console.log('❌ No courses found' + (termFilter ? ` for term "${termFilter}"` : ''));
      rl.close();
      return;
    }

    // Display courses for selection
    console.log('📚 Available courses:');
    console.log('─'.repeat(50));
    allCourses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.name} (${course.term}) [${course.role}]`);
    });
    console.log('─'.repeat(50));

    // Ask user to select a course
    const selection = await askQuestion(`\nSelect a course (1-${allCourses.length}): `);
    const courseIndex = parseInt(selection) - 1;

    if (courseIndex < 0 || courseIndex >= allCourses.length) {
      console.log('❌ Invalid selection');
      rl.close();
      return;
    }

    const selectedCourse = allCourses[courseIndex];
    console.log(`\n🎯 Selected: ${selectedCourse.name} (${selectedCourse.term})`);
    console.log('📝 Fetching assignments...\n');

    // Fetch assignments for selected course
    const assignments = await fetchGradescopeAssignments(selectedCourse.id, { email, password });

    if (assignments.length === 0) {
      console.log('❌ No assignments found for this course');
    } else {
      console.log(`📋 Found ${assignments.length} assignments:\n`);
      console.log('─'.repeat(80));
      
      assignments.forEach((assignment, index) => {
        console.log(`${index + 1}. ${assignment.title}`);
        
        if (assignment.due_date) {
          console.log(`   📅 Due Date: ${assignment.due_date.toLocaleString()}`);
          console.log(`   📅 Due Date (ISO): ${assignment.due_date.toISO()}`);
        } else {
          console.log(`   📅 Due Date: Not set`);
        }
        
        console.log(`   📊 Status: ${assignment.submissions_status}`);
        
        if (assignment.grade !== null && assignment.points) {
          console.log(`   🎯 Grade: ${assignment.grade}/${assignment.points}`);
        }
        
        console.log('─'.repeat(80));
      });

      // Summary of due dates
      const dueDates = assignments
        .filter(a => a.due_date)
        .map(a => ({
          title: a.title,
          due_date: a.due_date.toISO(),
          formatted: a.due_date.toLocaleString()
        }))
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

      if (dueDates.length > 0) {
        console.log('\n📅 Due Dates Summary (sorted by date):');
        console.log('─'.repeat(80));
        dueDates.forEach(item => {
          console.log(`• ${item.title}`);
          console.log(`  Due: ${item.formatted}`);
          console.log(`  ISO: ${item.due_date}`);
          console.log('');
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

main();