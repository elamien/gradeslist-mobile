// Real Mobile Gradescope API - React Native Compatible
// This version uses fetch and react-native-html-parser instead of axios and cheerio

import { DateTime } from 'luxon';
import { DOMParser } from 'react-native-html-parser';
import { PlatformCredentials } from '../store/useAppStore';
import { GradescopeAssignment, GradescopeCourse, GradescopeCourseList } from './gradescope-api';

// Session cache to avoid repeated authentication
const sessionCache = new Map<string, { cookies: string; timestamp: number }>();
const SESSION_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Helper to get session cookies from credentials
async function getSessionCookies(credentials?: PlatformCredentials): Promise<string> {
  if (!credentials) {
    throw new Error('Authentication required: credentials were not provided.');
  }

  // Check if this is a proxy connection (new WebView proxy pattern)
  if (credentials.proxyReady && credentials.cookies === 'proxy-session-verified') {
    console.log('Using proxy-based authentication.');
    return 'proxy-session-verified'; // Return a placeholder since we don't have actual cookies
  }

  if (credentials.cookies && credentials.cookies !== 'proxy-session-verified') {
    console.log('Using provided session cookies.');
    return credentials.cookies;
  }

  if (credentials.username && credentials.password) {
    console.log('Authenticating with username/password to get session cookies.');
    return await authenticateGradescope(credentials.username, credentials.password);
  }

  throw new Error('Invalid authentication credentials: provide either cookies, username/password, or proxy authentication.');
}

// Core function to fetch courses - supports both email/password and session cookies
export async function fetchGradescopeCourses(
  filterTerm?: string,
  credentials?: PlatformCredentials
): Promise<GradescopeCourseList> {
  const sessionCookies = await getSessionCookies(credentials);
  
  // Check if this is proxy-based auth (now using server)
  if (sessionCookies === 'proxy-session-verified') {
    console.log('Using server-based course fetching instead of WebView proxy');
    
    try {
      const { fetchServerGradescopeCourses } = await import('./server-gradescope-api');
      const courses = await fetchServerGradescopeCourses(filterTerm, credentials);
      console.log('Got real courses from server:', courses);
      return courses;
    } catch (error) {
      console.error('Error fetching courses from server:', error);
      return { student: {}, instructor: {} };
    }
  }
  
  // Fetch courses from Gradescope
  const allCourses = await fetchCoursesFromGradescope(sessionCookies);
  
  // Filter courses by term if specified
  if (filterTerm) {
    const filteredCourses: GradescopeCourseList = {
      student: {},
      instructor: {}
    };
    
    // Filter student courses
    Object.entries(allCourses.student).forEach(([id, course]) => {
      if (course.term.toLowerCase().includes(filterTerm.toLowerCase())) {
        filteredCourses.student[id] = course;
      }
    });
    
    // Filter instructor courses
    Object.entries(allCourses.instructor).forEach(([id, course]) => {
      if (course.term.toLowerCase().includes(filterTerm.toLowerCase())) {
        filteredCourses.instructor[id] = course;
      }
    });
    
    return filteredCourses;
  }
  
  return allCourses;
}

// Core function to fetch assignments - supports both email/password and session cookies
export async function fetchGradescopeAssignments(
  courseId: string,
  credentials?: PlatformCredentials
): Promise<GradescopeAssignment[]> {
  const sessionCookies = await getSessionCookies(credentials);
  
  // Check if this is proxy-based auth (now using server)
  if (sessionCookies === 'proxy-session-verified') {
    console.log('Using server-based assignment fetching instead of WebView proxy');
    
    try {
      const { fetchServerGradescopeAssignments } = await import('./server-gradescope-api');
      const assignments = await fetchServerGradescopeAssignments(courseId, credentials);
      console.log('Got real assignments from server:', assignments);
      return assignments;
    } catch (error) {
      console.error('Error fetching assignments from server:', error);
      return [];
    }
  }
  
  // Fetch assignments from Gradescope
  const assignments = await fetchAssignmentsFromGradescope(courseId, sessionCookies);
  
  return assignments;
}

// Core authentication function - handles Gradescope's native login method
export async function authenticateGradescope(email: string, password: string): Promise<string> {
  // Check cache first
  const cacheKey = `${email}:${password}`;
  const cached = sessionCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < SESSION_CACHE_DURATION) {
    console.log('Using cached Gradescope session');
    return cached.cookies;
  }
  
  const GRADESCOPE_BASE_URL = 'https://www.gradescope.com';
  
  let cookies = '';
  
  try {
    console.log('Fetching Gradescope login page...');
    // Get CSRF token from login page (simplified)
    const loginPageResponse = await fetch(`${GRADESCOPE_BASE_URL}/login`);
    
    if (!loginPageResponse.ok) {
      console.error('Failed to fetch login page:', loginPageResponse.status, loginPageResponse.statusText);
      throw new Error(`Failed to fetch login page: ${loginPageResponse.status} ${loginPageResponse.statusText}`);
    }
    
    // Extract cookies from login page (simplified like Node.js version)
    const setCookieHeaders = loginPageResponse.headers.get('set-cookie');
    if (setCookieHeaders) {
      cookies = setCookieHeaders.split(';')[0];
      console.log('Got initial cookies from login page:', cookies);
    }
    
    const html = await loginPageResponse.text();
    const match = html.match(/<meta name="csrf-token" content="([^"]+)"/);
    if (!match) {
      console.error('Could not find CSRF token. HTML length:', html.length);
      // Log first 1000 characters of HTML for debugging
      console.log('HTML sample:', html.substring(0, 1000));
      throw new Error('Could not find CSRF token on login page');
    }
    const authToken = match[1];
    console.log('Found CSRF token:', authToken.substring(0, 10) + '...');
    
    // Simplified form data creation (like Node.js version)
    const formData = new URLSearchParams({
      'utf8': '✓',
      'authenticity_token': authToken,
      'session[email]': email,
      'session[password]': password,
      'session[remember_me]': '0',
      'commit': 'Log In',
      'session[remember_me_sso]': '0'
    });
    
    console.log('Form data being submitted:', formData.toString());
    
    console.log('Submitting login form...');
    // Submit login form (simplified like Node.js version)
    const loginResponse = await fetch(`${GRADESCOPE_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': `${GRADESCOPE_BASE_URL}/login`
      },
      body: formData.toString(),
      redirect: 'manual'
    });
    
    console.log('Login response status:', loginResponse.status);
    
    if (loginResponse.status === 302) {
      console.log('Login got redirect (302) - looks successful');
      // Extract additional cookies from login response
      const loginSetCookieHeaders = loginResponse.headers.get('set-cookie');
      if (loginSetCookieHeaders) {
        const newCookieStrings = loginSetCookieHeaders.split(',').map(cookie => cookie.trim().split(';')[0]);
        const newCookies = newCookieStrings.join('; ');
        cookies = cookies ? `${cookies}; ${newCookies}` : newCookies;
        console.log('Got additional cookies from login response:', newCookies);
      }
      
      const redirectUrl = loginResponse.headers.get('location');
      const fullRedirectUrl = redirectUrl?.startsWith('http') ? redirectUrl : `${GRADESCOPE_BASE_URL}${redirectUrl}`;
      console.log('Following redirect to:', fullRedirectUrl);
      
      const accountResponse = await fetch(fullRedirectUrl!, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': cookies
        }
      });
      
      if (accountResponse.ok) {
        const accountHtml = await accountResponse.text();
        // Check if we're still on the login page (login failed)
        if (accountHtml.includes('Log In') && accountHtml.includes('password')) {
          console.error('Login failed - still on login page');
          throw new Error('Gradescope login failed - invalid credentials');
        }
        
        // Login successful, cache and return session cookies
        console.log('Login successful! Caching session cookies');
        sessionCache.set(cacheKey, { cookies, timestamp: Date.now() });
        return cookies;
      } else {
        console.error('Account page response not OK:', accountResponse.status);
        throw new Error(`Account page returned ${accountResponse.status}`);
      }
    } else if (loginResponse.status === 200) {
      // Check if we got a login page again (credentials failed)
      const loginHtml = await loginResponse.text();
      console.log('Got 200 response, checking content...');
      console.log('Response HTML sample:', loginHtml.substring(0, 500));
      
      if (loginHtml.includes('Log In') && loginHtml.includes('password')) {
        console.error('Login failed - credentials rejected');
        
        // Check for specific error messages
        if (loginHtml.includes('Invalid email or password')) {
          throw new Error('Gradescope login failed - invalid email or password');
        } else if (loginHtml.includes('error') || loginHtml.includes('alert')) {
          // Look for various error message patterns
          const errorPatterns = [
            /<div[^>]*class="[^"]*error[^"]*"[^>]*>(.*?)<\/div>/s,
            /<div[^>]*class="[^"]*alert[^"]*"[^>]*>(.*?)<\/div>/s,
            /<p[^>]*class="[^"]*error[^"]*"[^>]*>(.*?)<\/p>/s,
            /<span[^>]*class="[^"]*error[^"]*"[^>]*>(.*?)<\/span>/s
          ];
          
          for (const pattern of errorPatterns) {
            const errorMatch = loginHtml.match(pattern);
            if (errorMatch) {
              console.log('Error message found:', errorMatch[1].trim());
              break;
            }
          }
        }
        
        // Look for specific error indicators
        if (loginHtml.includes('Invalid login') || loginHtml.includes('Invalid email') || loginHtml.includes('Invalid password')) {
          throw new Error('Gradescope login failed - invalid email or password');
        }
        
        // Check if we're being asked for additional verification
        if (loginHtml.includes('verification') || loginHtml.includes('captcha') || loginHtml.includes('2FA') || loginHtml.includes('two-factor')) {
          throw new Error('Gradescope login failed - additional verification required (2FA/CAPTCHA)');
        }
        
        // Check if credentials are simply wrong
        if (loginHtml.includes('email') && loginHtml.includes('password') && loginHtml.includes('Log In')) {
          throw new Error('Gradescope login failed - please verify your email and password are correct. Try logging in manually through a web browser first to confirm your credentials work.');
        }
        
        throw new Error('Gradescope login failed - invalid credentials');
      }
      throw new Error('Gradescope login failed - unexpected 200 response');
    }
    
    console.error('Unexpected login response status:', loginResponse.status);
    throw new Error(`Gradescope login failed - unexpected response: ${loginResponse.status}`);
    
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gradescope authentication failed: ${error.message}`);
    }
    throw new Error('Gradescope authentication failed: Unknown error');
  }
}

// Fetch courses from Gradescope account page
async function fetchCoursesFromGradescope(sessionCookies: string): Promise<GradescopeCourseList> {
  const response = await fetch('https://www.gradescope.com/account', {
    method: 'GET',
    headers: {
      'Cookie': sessionCookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch courses from Gradescope: ${response.status} ${response.statusText}`);
  }
  
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const courses: GradescopeCourseList = {
    student: {},
    instructor: {}
  };
  
  // Parse student courses
  const courseBoxes = doc.querySelectorAll('.courseList--coursesForTerm .courseBox:not(.courseBox-new)');
  courseBoxes.forEach((courseBox: any) => {
    const course = parseCourseInfo(doc, courseBox);
    if (course) {
      courses.student[course.id] = course;
    }
  });
  
  return courses;
}

// Parse course info from HTML elements
function parseCourseInfo(doc: any, courseBox: any): GradescopeCourse | null {
  try {
    const shortNameElement = courseBox.querySelector('.courseBox--shortname');
    const nameElement = courseBox.querySelector('.courseBox--name');
    
    // Find term by traversing up to find the term header
    let termElement = courseBox;
    while (termElement && termElement.parentElement) {
      termElement = termElement.parentElement;
      if (termElement.classList?.contains('courseList--coursesForTerm')) {
        const prevElement = termElement.previousElementSibling;
        if (prevElement) {
          const term = prevElement.textContent?.trim() || '';
          if (term) {
            break;
          }
        }
      }
    }
    
    const term = termElement?.textContent?.trim() || '';
    const name = nameElement?.textContent?.trim() || shortNameElement?.textContent?.trim();
    const href = courseBox.getAttribute('href');
    const courseId = href?.split('/').pop();
    
    if (!name || !courseId) {
      return null;
    }
    
    return {
      id: courseId,
      name,
      term
    };
  } catch (_error) {
    return null;
  }
}

// Fetch assignments from Gradescope course page
async function fetchAssignmentsFromGradescope(courseId: string, sessionCookies: string): Promise<GradescopeAssignment[]> {
  const response = await fetch(`https://www.gradescope.com/courses/${courseId}`, {
    method: 'GET',
    headers: {
      'Cookie': sessionCookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch assignments from Gradescope');
  }
  
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const assignments: GradescopeAssignment[] = [];
  
  // Parse assignments table
  const assignmentRows = doc.querySelectorAll('#assignments-student-table tbody tr');
  assignmentRows.forEach((row: any) => {
    try {
      const nameCell = row.querySelector('th.table--primaryLink');
      const anchor = nameCell?.querySelector('a');
      
      let name: string | undefined = undefined;
      let assignment_id: string | undefined = undefined;
      let submission_id: string | undefined = undefined;
      
      if (anchor) {
        name = anchor.textContent?.trim();
        const href = anchor.getAttribute('href');
        if (href) {
          const parts = href.split('/').filter(part => part !== '');
          const submissionsIndex = parts.indexOf('submissions');
          if (submissionsIndex !== -1 && submissionsIndex + 1 < parts.length) {
            submission_id = parts[submissionsIndex + 1];
            assignment_id = parts[submissionsIndex - 1];
          } else if (parts.indexOf('assignments') !== -1 && parts.indexOf('assignments') + 1 < parts.length) {
            assignment_id = parts[parts.indexOf('assignments') + 1];
          } else {
            assignment_id = parts.pop();
          }
        }
      } else {
        name = nameCell?.textContent?.trim();
      }
      
      if (!assignment_id) {
        if (name) {
          const slugifiedName = name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
          assignment_id = `${courseId}-placeholder-${slugifiedName}`;
        } else {
          return;
        }
      }
      
      if (!name || !assignment_id) {
        return;
      }
      
      const statusCell = row.querySelector('td.submissionStatus');
      const dateCell = row.querySelector('td:nth-of-type(2)');
      
      const dueDateElements = dateCell?.querySelectorAll('time.submissionTimeChart--dueDate');
      
      const gradeText = statusCell?.querySelector('.submissionStatus--score')?.textContent?.trim() || '';
      const gradeMatch = gradeText.match(/(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)/);
      const grade = gradeMatch ? parseFloat(gradeMatch[1]) : null;
      const max_grade = gradeMatch ? parseFloat(gradeMatch[2]) : null;
      
      let submissions_status = 'Not submitted';
      const statusText = statusCell?.querySelector('.submissionStatus--text')?.textContent?.trim();
      if (statusText) {
        submissions_status = statusText;
      } else if (grade !== null) {
        submissions_status = 'Graded';
      } else if (statusCell?.textContent?.includes('Submitted')) {
        submissions_status = 'Submitted';
      }
      
      if (statusCell?.textContent?.includes('Late')) {
        submissions_status += ' (Late)';
      }
      
      const dueDate = dueDateElements?.length > 0 ? parseDate(dueDateElements[0].getAttribute('datetime')) : null;
      
      const assignment: GradescopeAssignment = {
        id: assignment_id,
        title: name,
        due_date: dueDate,
        submissions_status,
        grade,
        points: max_grade?.toString() ?? null,
        submission_id
      };
      
      assignments.push(assignment);
    } catch (_error) {
      // Continue to next row
    }
  });
  
  return assignments;
}

// Parse date from Gradescope datetime attribute
function parseDate(dateTimeAttr: string | null): DateTime | null {
  if (!dateTimeAttr) {
    return null;
  }
  
  try {
    const isoString = dateTimeAttr.replace(/ ([-+])/, 'T$1');
    const parsed = DateTime.fromISO(isoString);
    if (parsed.isValid) {
      return parsed;
    }
  } catch (_e) {
    // Ignore parsing errors
  }
  
  return null;
}

// Test Gradescope connection
export async function testGradescopeConnection(credentials: PlatformCredentials): Promise<boolean> {
  try {
    console.log('Testing Gradescope connection...');
    
    // Check if this is a proxy connection (now using server)
    if (credentials.proxyReady && credentials.loginData) {
      console.log('Testing server-based connection instead of proxy');
      try {
        const { testServerGradescopeConnection } = await import('./server-gradescope-api');
        return await testServerGradescopeConnection(credentials);
      } catch (error) {
        console.error('Server connection test error:', error);
        return false;
      }
    }
    
    // Fallback to traditional cookie/username-password method
    const sessionCookies = await getSessionCookies(credentials);
    
    // To truly test the connection, we need to make a request.
    // Fetching the account page is a good way to verify the session.
    await fetchCoursesFromGradescope(sessionCookies);
    
    console.log('Gradescope connection test successful');
    return true;
  } catch (error) {
    console.error('Gradescope connection test failed:', error);
    
    // Check if this is a React Native specific issue
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('2FA') || errorMessage.includes('CAPTCHA') || errorMessage.includes('verification')) {
      console.warn('Gradescope may be blocking mobile app access. This is a known limitation.');
      // For now, we'll return false but in the future we might implement a web-based auth flow
    }
    
    return false;
  }
}