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
 * Fetch assignments for a specific course (simplified for now)
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
    
    // Basic assignment parsing (can be enhanced later)
    $('#assignments-student-table tbody tr').each((index, rowElement) => {
      try {
        const $row = $(rowElement);
        const $nameCell = $row.find('th.table--primaryLink');
        const $anchor = $nameCell.find('a');
        
        let name = $anchor.length > 0 ? $anchor.text()?.trim() : $nameCell.text()?.trim();
        
        if (name) {
          assignments.push({
            id: `${courseId}-${index}`,
            title: name,
            due_date: null, // Can be enhanced
            status: 'unknown'
          });
        }
      } catch (error) {
        // Continue to next row
      }
    });
    
    console.log(`[REWRITTEN] Found ${assignments.length} assignments`);
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