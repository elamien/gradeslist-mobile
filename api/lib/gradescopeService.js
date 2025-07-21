const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Gradescope Service - Rewritten to match working legacy code exactly
 * Based on: /Users/ahmed/repos/gradeslist-v2/api-extraction/gradescope-api.js
 */

/**
 * Parse course info from HTML elements (exact copy from working code)
 */
function parseCourseInfo($, courseBox) {
  try {
    const $courseBox = $(courseBox);
    const shortNameElement = $courseBox.find('.courseBox--shortname');
    const nameElement = $courseBox.find('.courseBox--name');
    
    // Extract term using exact working logic
    const term = $courseBox.closest('.courseList--coursesForTerm')
      .prev()
      .text()?.trim() || '';
    
    const name = nameElement.text()?.trim() || shortNameElement.text()?.trim();
    const href = $courseBox.attr('href');
    const courseId = href?.split('/').pop();
    
    if (!name || !courseId) {
      return null;
    }
    
    return {
      id: courseId,
      name: name,
      term: term
    };
  } catch (error) {
    return null;
  }
}

/**
 * Fetch courses using exact working approach from legacy code
 */
async function fetchCourses(sessionCookies, filterTerm) {
  try {
    console.log('[REWRITTEN] Fetching courses using working legacy approach...');
    
    // Use exact same request as working code
    const response = await axios.get('https://www.gradescope.com/account', {
      headers: {
        Cookie: sessionCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const courses = [];
    
    // Use exact working selector from legacy code
    $('.courseList--coursesForTerm .courseBox:not(.courseBox-new)').each((index, element) => {
      const course = parseCourseInfo($, element);
      if (course) {
        console.log(`[REWRITTEN] Found course: ${course.name} - Term: "${course.term}"`);
        
        // Apply term filter if specified (exact same logic as legacy)
        if (!filterTerm || course.term.toLowerCase().includes(filterTerm.toLowerCase())) {
          courses.push({
            id: course.id,
            name: course.name,
            term: course.term,
            url: `/courses/${course.id}`,
            platform: 'gradescope'
          });
          console.log(`[REWRITTEN] INCLUDED: ${course.name} (${course.term})`);
        } else {
          console.log(`[REWRITTEN] EXCLUDED: ${course.name} (${course.term}) - doesn't match filter "${filterTerm}"`);
        }
      }
    });
    
    console.log(`[REWRITTEN] Final result: ${courses.length} courses${filterTerm ? ` for term "${filterTerm}"` : ''}`);
    return courses;
    
  } catch (error) {
    console.error('[REWRITTEN] Error fetching courses:', error.message);
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }
}

/**
 * Authenticate with Gradescope (simplified version of working code)
 */
async function authenticateGradescope(email, password) {
  try {
    console.log('[REWRITTEN] Authenticating with Gradescope...');
    
    const session = axios.create({
      baseURL: 'https://www.gradescope.com',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    let cookies = '';
    
    // Add response interceptor to capture cookies (from working code)
    session.interceptors.response.use((response) => {
      const responseCookies = response.headers['set-cookie'];
      if (responseCookies) {
        const cookieMap = new Map();
        if (cookies) {
          cookies.split('; ').forEach((cookie) => {
            const name = cookie.split('=')[0];
            cookieMap.set(name, cookie);
          });
        }
        responseCookies.forEach((cookie) => {
          const cookieStr = cookie.split(';')[0];
          const name = cookieStr.split('=')[0];
          cookieMap.set(name, cookieStr);
        });
        cookies = Array.from(cookieMap.values()).join('; ');
        if (cookies) {
          session.defaults.headers.Cookie = cookies;
        }
      }
      return response;
    });
    
    // Get login page for CSRF token
    const loginPageResponse = await session.get('/login');
    const html = loginPageResponse.data;
    const match = html.match(/<meta name="csrf-token" content="([^"]+)"/);
    
    if (!match) {
      throw new Error('Could not find CSRF token on login page');
    }
    
    const authToken = match[1];
    
    // Submit login form (exact same as working code)
    const formData = new URLSearchParams();
    formData.append('utf8', '✓');
    formData.append('authenticity_token', authToken);
    formData.append('session[email]', email);
    formData.append('session[password]', password);
    formData.append('session[remember_me]', '0');
    formData.append('commit', 'Log In');
    formData.append('session[remember_me_sso]', '0');
    
    const loginResponse = await session.post('/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Origin': 'https://www.gradescope.com',
        'Referer': 'https://www.gradescope.com/login'
      },
      maxRedirects: 0,
      validateStatus: (status) => status === 302
    });
    
    if (loginResponse.status === 302) {
      const redirectUrl = loginResponse.headers.location;
      const fullRedirectUrl = redirectUrl.startsWith('http') ? redirectUrl : `https://www.gradescope.com${redirectUrl}`;
      
      const accountResponse = await session.get(fullRedirectUrl);
      
      if (accountResponse.status === 200) {
        if (accountResponse.data.includes('Log In')) {
          throw new Error('Gradescope login failed - invalid credentials');
        }
        console.log('[REWRITTEN] Authentication successful');
        return cookies;
      }
    }
    
    throw new Error('Gradescope login failed - unexpected response');
    
  } catch (error) {
    console.error('[REWRITTEN] Authentication error:', error.message);
    throw new Error(`Gradescope authentication failed: ${error.message}`);
  }
}

/**
 * Parse date from Gradescope elements (copied exactly from working code)
 */
function parseDate($, element) {
  if (!element) {
    return null;
  }
  
  const $element = $(element);
  
  // Try parsing the datetime attribute (EXACT copy from working code)
  const datetimeAttr = $element.attr('datetime');
  if (datetimeAttr) {
    try {
      console.log(`[REWRITTEN] Found datetime attribute: "${datetimeAttr}"`);
      const isoString = datetimeAttr.replace(/ ([-+])/, 'T$1');
      console.log(`[REWRITTEN] Converted to ISO: "${isoString}"`);
      const parsed = new Date(isoString);
      if (!isNaN(parsed.getTime())) {
        console.log(`[REWRITTEN] Successfully parsed datetime: ${parsed}`);
        return parsed;
      }
    } catch (e) {
      console.log(`[REWRITTEN] Error parsing datetime: ${e.message}`);
    }
  }
  
  // Fallback to parsing the human-readable text (EXACT copy from working code)
  const dateText = $element.text()?.trim();
  if (dateText) {
    console.log(`[REWRITTEN] Trying to parse text: "${dateText}"`);
    try {
      if (dateText.startsWith('Late Due Date: ')) {
        dateText = dateText.substring('Late Due Date: '.length);
      }
      
      // Try specific Gradescope formats that working code uses
      const formatPatterns = [
        // Common formats from working code
        /^(\w{3})\s+(\d{1,2})\s+at\s+(\d{1,2}):(\d{2})(am|pm)$/i, // "Jul 15 at 11:59pm"
        /^(\w{3})\s+(\d{1,2}),?\s+(\d{4})$/i,                     // "Jul 15, 2025" or "Jul 15 2025"
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,                        // "7/15/2025"
      ];
      
      for (const pattern of formatPatterns) {
        if (pattern.test(dateText)) {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime())) {
            console.log(`[REWRITTEN] Successfully parsed text date: ${parsed}`);
            return parsed;
          }
        }
      }
      
    } catch (e) {
      console.log(`[REWRITTEN] Error parsing date text: ${e.message}`);
    }
  }
  
  return null;
}

/**
 * Fetch assignments for a specific course (enhanced with proper parsing)
 */
async function fetchAssignments(sessionCookies, courseId) {
  try {
    console.log(`[REWRITTEN] Fetching assignments for course ${courseId}...`);
    
    const response = await axios.get(`https://www.gradescope.com/courses/${courseId}`, {
      headers: {
        Cookie: sessionCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const assignments = [];
    
    // Enhanced assignment parsing (copied from working code)
    $('#assignments-student-table tbody tr').each((index, rowElement) => {
      try {
        const $row = $(rowElement);
        const $nameCell = $row.find('th.table--primaryLink');
        const $anchor = $nameCell.find('a');
        
        let name = $anchor.length > 0 ? $anchor.text()?.trim() : $nameCell.text()?.trim();
        let assignment_id = `${courseId}-${index}`;
        
        // Try to extract assignment ID from href
        if ($anchor.length > 0) {
          const href = $anchor.attr('href');
          if (href) {
            const parts = href.split('/').filter(part => part !== '');
            const submissionsIndex = parts.indexOf('submissions');
            if (submissionsIndex !== -1 && submissionsIndex + 1 < parts.length) {
              assignment_id = parts[submissionsIndex - 1];
            } else if (parts.indexOf('assignments') !== -1 && parts.indexOf('assignments') + 1 < parts.length) {
              assignment_id = parts[parts.indexOf('assignments') + 1];
            }
          }
        }
        
        if (!name || !assignment_id) {
          return;
        }
        
        // Extract dates, status, and grades (EXACT copy from working code)
        const $statusCell = $row.find('td.submissionStatus');
        const $dateCell = $row.find('td:nth-of-type(2)');
        const dueDateElements = $dateCell.find('time.submissionTimeChart--dueDate').get();
        
        console.log(`[REWRITTEN] Assignment "${name}" - found ${dueDateElements.length} due date elements`);
        
        const gradeText = $statusCell.find('.submissionStatus--score').text()?.trim() || '';
        const gradeMatch = gradeText.match(/(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)/);
        const grade = gradeMatch ? parseFloat(gradeMatch[1]) : null;
        const max_grade = gradeMatch ? parseFloat(gradeMatch[2]) : null;
        
        let submissions_status = 'Not submitted';
        const statusText = $statusCell.find('.submissionStatus--text').text()?.trim();
        if (statusText) {
          submissions_status = statusText;
        } else if (grade !== null) {
          submissions_status = 'Graded';
        } else if ($statusCell.text()?.includes('Submitted')) {
          submissions_status = 'Submitted';
        }
        
        if ($statusCell.text()?.includes('Late')) {
          submissions_status += ' (Late)';
        }
        
        const dueDate = dueDateElements.length > 0 ? parseDate($, dueDateElements[0]) : null;
        
        console.log(`[REWRITTEN] Final due date for "${name}":`, dueDate);
        
        const assignment = {
          id: assignment_id,
          title: name,
          due_date: dueDate ? dueDate.toISOString() : null,
          submissions_status: submissions_status,
          grade: grade,
          max_grade: max_grade,
          status: submissions_status,
          course_id: courseId,
          platform: 'gradescope',
          url: `/courses/${courseId}/assignments/${assignment_id}`,
          // Add debug info to help troubleshoot
          _debug_had_due_date: !!dueDate
        };
        
        assignments.push(assignment);
        
      } catch (error) {
        console.error(`[REWRITTEN] Error parsing assignment ${index}:`, error.message);
        // Continue to next row
      }
    });
    
    console.log(`[REWRITTEN] Found ${assignments.length} assignments with proper parsing`);
    return assignments;
    
  } catch (error) {
    console.error('[REWRITTEN] Error fetching assignments:', error.message);
    throw new Error(`Failed to fetch assignments: ${error.message}`);
  }
}

module.exports = {
  fetchCourses,
  authenticateGradescope,
  fetchAssignments
};