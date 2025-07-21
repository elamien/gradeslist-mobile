const axios = require('axios');
const cheerio = require('cheerio');

// Create axios instance with default config
const client = axios.create({
  timeout: 30000, // 30 second timeout
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
});

// Session cache to avoid repeated authentication
const sessionCache = new Map();
const SESSION_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Clear cache to pick up code changes
sessionCache.clear();

/**
 * Authenticate with Gradescope and return session cookies
 */
async function authenticateGradescope(email, password) {
  // Check cache first
  const cacheKey = `${email}:${password}`;
  const cached = sessionCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < SESSION_CACHE_DURATION) {
    console.log('Using cached Gradescope session');
    return cached.cookies;
  }

  const GRADESCOPE_BASE_URL = 'https://www.gradescope.com';
  
  try {
    console.log('Fetching Gradescope login page...');
    
    // Get CSRF token from login page
    const loginPageResponse = await client.get(`${GRADESCOPE_BASE_URL}/login`);
    
    if (loginPageResponse.status !== 200) {
      throw new Error(`Failed to fetch login page: ${loginPageResponse.status}`);
    }
    
    // Extract cookies from login page
    let cookies = '';
    const setCookieHeaders = loginPageResponse.headers['set-cookie'];
    if (setCookieHeaders) {
      cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
      console.log('Got initial cookies from login page');
    }
    
    // Parse HTML to get CSRF token
    const $ = cheerio.load(loginPageResponse.data);
    const authToken = $('meta[name="csrf-token"]').attr('content');
    
    if (!authToken) {
      console.error('Could not find CSRF token in login page');
      throw new Error('Could not find CSRF token on login page');
    }
    
    console.log('Found CSRF token, submitting login form...');
    
    // Prepare form data
    const formData = new URLSearchParams({
      'utf8': '✓',
      'authenticity_token': authToken,
      'session[email]': email,
      'session[password]': password,
      'session[remember_me]': '0',
      'commit': 'Log In',
      'session[remember_me_sso]': '0'
    });
    
    // Submit login form
    const loginResponse = await client.post(`${GRADESCOPE_BASE_URL}/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
        'Referer': `${GRADESCOPE_BASE_URL}/login`
      },
      maxRedirects: 0, // Handle redirects manually
      validateStatus: status => status === 302 || status === 200
    });
    
    console.log('Login response status:', loginResponse.status);
    
    if (loginResponse.status === 302) {
      // Success - extract additional cookies
      const loginSetCookieHeaders = loginResponse.headers['set-cookie'];
      if (loginSetCookieHeaders) {
        const newCookies = loginSetCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
        cookies = cookies ? `${cookies}; ${newCookies}` : newCookies;
        console.log('Login successful, got session cookies');
      }
      
      // Verify by accessing account page
      const redirectUrl = loginResponse.headers.location;
      const fullRedirectUrl = redirectUrl?.startsWith('http') ? redirectUrl : `${GRADESCOPE_BASE_URL}${redirectUrl}`;
      
      const accountResponse = await client.get(fullRedirectUrl, {
        headers: { 'Cookie': cookies }
      });
      
      if (accountResponse.status === 200) {
        // Check if we're actually logged in
        const accountHtml = accountResponse.data;
        if (accountHtml.includes('Log In') && accountHtml.includes('password')) {
          throw new Error('Gradescope login failed - invalid credentials');
        }
        
        // Cache successful session
        sessionCache.set(cacheKey, { cookies, timestamp: Date.now() });
        console.log('Login verification successful, session cached');
        return cookies;
      }
    } else if (loginResponse.status === 200) {
      // Check if login failed
      const loginHtml = loginResponse.data;
      if (loginHtml.includes('Invalid login') || loginHtml.includes('Invalid email') || loginHtml.includes('Invalid password')) {
        throw new Error('Invalid email or password');
      }
      if (loginHtml.includes('verification') || loginHtml.includes('captcha') || loginHtml.includes('2FA')) {
        throw new Error('Additional verification required (2FA/CAPTCHA)');
      }
      throw new Error('Login failed - unexpected response');
    }
    
    throw new Error(`Unexpected login response: ${loginResponse.status}`);
    
  } catch (error) {
    if (error.message) {
      throw error;
    }
    throw new Error(`Gradescope authentication failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Fetch courses from Gradescope account page
 */
async function fetchCourses(sessionCookies, filterTerm = null) {
  try {
    console.log('Fetching courses from account page...');
    
    const response = await client.get('https://www.gradescope.com/account', {
      headers: { 'Cookie': sessionCookies }
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch account page: ${response.status}`);
    }
    
    const $ = cheerio.load(response.data);
    const courses = [];
    
    // Look for course boxes - try multiple selectors
    const courseSelectors = [
      '.courseBox',
      '.course-card', 
      '[class*="course"]:not(.courseList)',
      '.courseList--coursesForTerm .courseBox'
    ];
    
    let courseElements = $();
    for (const selector of courseSelectors) {
      courseElements = $(selector);
      if (courseElements.length > 0) {
        console.log(`Found ${courseElements.length} course elements with selector: ${selector}`);
        break;
      }
    }
    
    courseElements.each((index, element) => {
      try {
        const $el = $(element);
        
        // Extract course name
        const nameSelectors = ['.courseBox--name', '.course-name', 'h3', 'h4', 'a'];
        let courseName = '';
        for (const selector of nameSelectors) {
          courseName = $el.find(selector).first().text().trim();
          if (courseName) break;
        }
        
        // If no name found and element is a link, use the link text
        if (!courseName && $el.is('a')) {
          courseName = $el.text().trim();
        }
        
        // Fallback: use any text content
        if (!courseName) {
          courseName = $el.text().trim();
        }
        
        // Extract course URL/ID - check if the element itself is a link
        let courseUrl = '';
        let linkEl = null;
        
        if ($el.is('a')) {
          // The course element itself is a link
          courseUrl = $el.attr('href') || '';
          linkEl = $el;
        } else {
          // Look for a link within the element
          linkEl = $el.find('a').first();
          courseUrl = linkEl.attr('href') || '';
        }
        
        console.log(`Course ${index}: URL="${courseUrl}", Element HTML:`, $el.html().substring(0, 200));
        
        // Extract course ID from URL - handle both relative and absolute URLs
        let courseId = '';
        if (courseUrl) {
          // Handle relative URLs like /courses/123456
          const urlParts = courseUrl.split('/').filter(part => part !== '');
          const coursesIndex = urlParts.indexOf('courses');
          if (coursesIndex !== -1 && coursesIndex + 1 < urlParts.length) {
            courseId = urlParts[coursesIndex + 1];
          } else {
            // Fallback: take the last non-empty part that looks like a course ID
            for (let i = urlParts.length - 1; i >= 0; i--) {
              const part = urlParts[i];
              // Course IDs are typically numeric or contain numbers
              if (/^\d+$/.test(part) || /course.*\d+/i.test(part)) {
                courseId = part;
                break;
              }
            }
            // If still no ID found, use fallback
            if (!courseId) {
              courseId = `course_${index}`;
            }
          }
        } else {
          // Try to find course ID in the element attributes or data
          courseId = $el.attr('data-course-id') || 
                   $el.find('[data-course-id]').attr('data-course-id') ||
                   `course_${index}`;
        }
        
        console.log(`Course ${index}: Final ID="${courseId}"`);
        
        // Extract term information with detailed logging
        let term = 'Unknown Term';
        console.log(`Course: ${courseName} - Starting term detection...`);
        
        // Look for term in various places
        const termSelectors = ['.term', '.semester', '[class*="term"]', '[class*="semester"]'];
        for (const selector of termSelectors) {
          const termText = $el.find(selector).text().trim();
          if (termText) {
            term = termText;
            console.log(`Found term "${term}" using selector "${selector}"`);
            break;
          }
        }
        
        // If no term found in element, look in parent containers
        if (term === 'Unknown Term') {
          let $parent = $el.parent();
          while ($parent.length > 0 && term === 'Unknown Term') {
            const parentText = $parent.text();
            const termMatch = parentText.match(/(spring|summer|fall|winter)\s*20\d{2}/i);
            if (termMatch) {
              term = termMatch[0];
              console.log(`Found term "${term}" in parent container`);
              break;
            }
            $parent = $parent.parent();
          }
        }
        
        // Log final term detection result
        console.log(`Course: ${courseName} - Final detected term: "${term}"`);
        
        if (courseName && courseId) {
          const course = {
            id: courseId,
            name: courseName,
            term: term,
            url: courseUrl,
            platform: 'gradescope'
          };
          
          // Filter by term if specified
          const shouldInclude = !filterTerm || term.toLowerCase().includes(filterTerm.toLowerCase());
          console.log(`Course: ${courseName} - Term filter check: term="${term}", filterTerm="${filterTerm}", shouldInclude=${shouldInclude}`);
          
          if (shouldInclude) {
            courses.push(course);
          } else {
            console.log(`Course: ${courseName} - EXCLUDED by term filter`);
          }
        }
      } catch (error) {
        console.error(`Error parsing course element ${index}:`, error.message);
      }
    });
    
    console.log(`Extracted ${courses.length} courses${filterTerm ? ` for term "${filterTerm}"` : ''}`);
    return courses;
    
  } catch (error) {
    console.error('Error fetching courses:', error.message);
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }
}

/**
 * Fetch assignments for a specific course
 */
async function fetchAssignments(sessionCookies, courseId) {
  try {
    console.log(`Fetching assignments for course ${courseId}...`);
    
    const response = await client.get(`https://www.gradescope.com/courses/${courseId}`, {
      headers: { 'Cookie': sessionCookies }
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch course page: ${response.status}`);
    }
    
    const $ = cheerio.load(response.data);
    const assignments = [];
    
    // Look for assignments table
    const assignmentRows = $('#assignments-student-table tbody tr, .assignments-table tbody tr, [class*="assignment"] tr');
    
    console.log(`Found ${assignmentRows.length} assignment rows`);
    
    assignmentRows.each((index, row) => {
      try {
        const $row = $(row);
        
        // Extract assignment name
        const nameCell = $row.find('th.table--primaryLink, .assignment-name, th:first-child');
        const nameLink = nameCell.find('a').first();
        const assignmentName = nameLink.text().trim() || nameCell.text().trim();
        
        if (!assignmentName) return; // Skip if no name found
        
        // Extract assignment ID from URL
        const assignmentUrl = nameLink.attr('href') || '';
        let assignmentId = assignmentUrl.split('/').pop() || `assignment_${courseId}_${index}`;
        
        // Extract due date using the exact same approach as the working project
        let dueDate = null;
        
        // Find the date cell (2nd td in the row) - exact same as working project
        const $dateCell = $row.find('td:nth-of-type(2)');
        const dueDateElements = $dateCell.find('time.submissionTimeChart--dueDate').get();
        
        console.log(`Assignment ${index}: Found ${dueDateElements.length} due date elements in 2nd td`);
        
        if (dueDateElements.length > 0) {
          // Parse only the FIRST element (regular due date, NOT late due date)
          const firstElement = $(dueDateElements[0]);
          
          // STEP 1: Try parsing the datetime attribute FIRST (preferred method)
          let datetimeAttr = firstElement.attr('datetime');
          if (datetimeAttr) {
            console.log(`Assignment ${index}: Found datetime attribute: "${datetimeAttr}"`);
            
            try {
              // Handle timezone conversion: "2025-07-15 23:59:00 -0400" -> "2025-07-15T23:59:00-04:00"
              let isoString = datetimeAttr;
              
              // Replace space before timezone with 'T' and space before time with 'T'
              isoString = isoString.replace(' ', 'T');  // "2025-07-15T23:59:00 -0400"
              isoString = isoString.replace(' ', '');   // "2025-07-15T23:59:00-0400"
              isoString = isoString.replace(/(-\d{2})(\d{2})$/, '$1:$2'); // "2025-07-15T23:59:00-04:00"
              
              console.log(`Assignment ${index}: Converted to ISO: "${isoString}"`);
              
              const parsedDate = new Date(isoString);
              if (!isNaN(parsedDate.getTime())) {
                dueDate = parsedDate.toISOString();
                console.log(`Assignment ${index}: Successfully parsed datetime: ${dueDate}`);
              } else {
                console.log(`Assignment ${index}: Date parsing failed for: "${isoString}"`);
              }
            } catch (e) {
              console.log(`Assignment ${index}: Failed to parse datetime attribute:`, e.message);
            }
          }
          
          // STEP 2: Fallback to text parsing if datetime attribute failed
          if (!dueDate) {
            let dateText = firstElement.text()?.trim();
            console.log(`Assignment ${index}: Trying text parsing: "${dateText}"`);
            
            if (dateText) {
              // Strip "Late Due Date: " prefix if present (like working project)
              if (dateText.startsWith('Late Due Date: ')) {
                dateText = dateText.substring('Late Due Date: '.length);
                console.log(`Assignment ${index}: Stripped late due prefix: "${dateText}"`);
              }
              
              // Try to parse common Gradescope text formats
              // This is a simplified version since we prefer datetime attribute
              try {
                const parsedDate = new Date(dateText);
                if (!isNaN(parsedDate.getTime())) {
                  dueDate = parsedDate.toISOString();
                  console.log(`Assignment ${index}: Parsed from text: ${dueDate}`);
                }
              } catch (e) {
                console.log(`Assignment ${index}: Failed to parse text:`, e.message);
              }
            }
          }
          
          // Log info about additional elements (late due dates we're ignoring)
          if (dueDateElements.length > 1) {
            const secondElement = $(dueDateElements[1]);
            const lateDueDate = secondElement.attr('datetime');
            console.log(`Assignment ${index}: Ignoring late due date (2nd element): ${lateDueDate}`);
          }
        }
        
        // Method 2: Fallback selectors if the main one doesn't work
        if (!dueDate) {
          console.log(`Assignment ${index}: Primary selector failed, trying fallback selectors...`);
          
          // Try other possible selectors
          const fallbackSelectors = [
            'time[datetime]',
            '.submissionTimeChart time',
            'td.submissionTimeChart [datetime]'
          ];
          
          for (const selector of fallbackSelectors) {
            const element = $row.find(selector).first();
            if (element.length > 0) {
              dueDate = element.attr('datetime');
              if (dueDate) {
                console.log(`Assignment ${index}: Found due date with fallback selector "${selector}": ${dueDate}`);
                break;
              }
            }
          }
        }
        
        // Method 3: Debug - log the entire row HTML to help troubleshoot
        if (!dueDate) {
          console.log(`Assignment ${index}: No due date found. Row HTML:`, $row.html().substring(0, 500));
        }
        
        console.log(`Assignment ${index}: Final due date="${dueDate}"`);
        
        // Extract status and grade
        const statusCell = $row.find('td.submissionStatus, .status, td:last-child');
        const gradeText = statusCell.find('.submissionStatus--score, .grade').text().trim();
        const statusText = statusCell.find('.submissionStatus--text, .status-text').text().trim();
        
        // Parse grade
        let grade = null;
        let maxGrade = null;
        const gradeMatch = gradeText.match(/(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)/);
        if (gradeMatch) {
          grade = parseFloat(gradeMatch[1]);
          maxGrade = parseFloat(gradeMatch[2]);
        }
        
        // Determine status
        let status = 'Not submitted';
        if (statusText) {
          status = statusText;
        } else if (grade !== null) {
          status = 'Graded';
        } else if (statusCell.text().includes('Submitted')) {
          status = 'Submitted';
        }
        
        if (statusCell.text().includes('Late')) {
          status += ' (Late)';
        }
        
        const assignment = {
          id: assignmentId,
          title: assignmentName,
          due_date: dueDate || null,
          status: status,
          grade: grade,
          max_grade: maxGrade,
          course_id: courseId,
          platform: 'gradescope',
          url: assignmentUrl
        };
        
        assignments.push(assignment);
        
      } catch (error) {
        console.error(`Error parsing assignment row ${index}:`, error.message);
      }
    });
    
    console.log(`Extracted ${assignments.length} assignments for course ${courseId}`);
    return assignments;
    
  } catch (error) {
    console.error('Error fetching assignments:', error.message);
    throw new Error(`Failed to fetch assignments: ${error.message}`);
  }
}

module.exports = {
  authenticateGradescope,
  fetchCourses,
  fetchAssignments
};