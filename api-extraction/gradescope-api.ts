// Gradescope API - Core Data Structures and Functions
// Extracted from: scrape-gradescope/src/types.ts, gradescope-fetch.ts, gradescope-fetch-courses.ts

import { DateTime } from 'luxon';
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

// Core Gradescope Assignment interface
export interface GradescopeAssignment {
  id: string;
  title: string;
  due_date: DateTime | null;          // Separate DateTime object
  submissions_status: string;
  grade: number | null;
  points: string | null;
  submission_id?: string;
}

// Core Gradescope Course interface
export interface GradescopeCourse {
  id: string;
  name: string;
  term: string;
}

// Core Gradescope CourseList interface
export interface GradescopeCourseList {
  instructor: { [key: string]: GradescopeCourse };
  student: { [key: string]: GradescopeCourse };
}

// Core Gradescope Member interface
export interface GradescopeMember {
  name: string;
  email: string;
  role: string;
  sid?: string;
}

// Core function to fetch courses - supports both email/password and session cookies
export async function fetchGradescopeCourses(
  filterTerm?: string,
  authOptions?: { email: string; password: string } | { sessionCookies: string }
): Promise<GradescopeCourseList> {
  let sessionCookies: string;
  
  // Handle authentication
  if (!authOptions) {
    throw new Error('Authentication required: provide either { email, password } or { sessionCookies }');
  }
  
  if ('email' in authOptions && 'password' in authOptions) {
    // Login with email/password to get session cookies
    sessionCookies = await authenticateGradescope(authOptions.email, authOptions.password);
  } else if ('sessionCookies' in authOptions) {
    // Use provided session cookies
    sessionCookies = authOptions.sessionCookies;
  } else {
    throw new Error('Invalid authentication options: provide either { email, password } or { sessionCookies }');
  }
  
  // Create GSConnection instance and set session cookies
  const connection = new GSConnection();
  connection.setSessionCookies(sessionCookies);
  
  // Initialize account
  await connection.initializeAccount();
  
  if (!connection.account) {
    throw new Error('Failed to initialize Gradescope account');
  }
  
  // Fetch all courses
  const allCourses = await connection.account.get_courses();
  
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
  authOptions?: { email: string; password: string } | { sessionCookies: string }
): Promise<GradescopeAssignment[]> {
  let sessionCookies: string;
  
  // Handle authentication
  if (!authOptions) {
    throw new Error('Authentication required: provide either { email, password } or { sessionCookies }');
  }
  
  if ('email' in authOptions && 'password' in authOptions) {
    // Login with email/password to get session cookies
    sessionCookies = await authenticateGradescope(authOptions.email, authOptions.password);
  } else if ('sessionCookies' in authOptions) {
    // Use provided session cookies
    sessionCookies = authOptions.sessionCookies;
  } else {
    throw new Error('Invalid authentication options: provide either { email, password } or { sessionCookies }');
  }
  
  // Create GSConnection instance and set session cookies
  const connection = new GSConnection();
  connection.setSessionCookies(sessionCookies);
  
  // Initialize account
  await connection.initializeAccount();
  
  if (!connection.account) {
    throw new Error('Failed to initialize Gradescope account');
  }
  
  // Fetch assignments for the specified course
  const assignments = await connection.account.get_assignments(courseId);
  
  return assignments;
}

// =============================================
// GRADESCOPE CONNECTION CLASS
// =============================================

class GSConnection {
  private session: AxiosInstance;
  private gradescope_base_url: string;
  private logged_in: boolean;
  private cookies: string;
  public account: Account | null;

  constructor(gradescope_base_url: string = 'https://www.gradescope.com') {
    this.gradescope_base_url = gradescope_base_url;
    this.logged_in = false;
    this.cookies = '';
    this.account = null;

    this.session = axios.create({
      baseURL: this.gradescope_base_url,
      timeout: 15000, // 15 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      },
      maxRedirects: 5
    });

    // Add response interceptor to capture cookies
    this.session.interceptors.response.use(response => {
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        // Parse existing cookies into a map
        const cookieMap = new Map();
        if (this.cookies) {
          this.cookies.split('; ').forEach(cookie => {
            const [name] = cookie.split('=');
            cookieMap.set(name, cookie);
          });
        }

        // Add new cookies to the map
        cookies.forEach(cookie => {
          const [cookieStr] = cookie.split(';');
          const [name] = cookieStr.split('=');
          cookieMap.set(name, cookieStr);
        });

        // Convert map back to cookie string
        this.cookies = Array.from(cookieMap.values()).join('; ');

        // Update session headers with new cookies
        this.session.defaults.headers.Cookie = this.cookies;
      }
      return response;
    });
  }

  public setSessionCookies(cookies: string): void {
    if (cookies) {
      this.cookies = cookies;
      this.session.defaults.headers.Cookie = this.cookies;
    }
  }

  public async initializeAccount(): Promise<void> {
    if (this.cookies && !this.account) {
      try {
        this.account = new Account(this);
      } catch (error) {
        this.account = null;
        this.cookies = '';
        delete this.session.defaults.headers.Cookie;
        throw error;
      }
    } else if (!this.account) {
      throw new Error('Cannot initialize account without session cookies.');
    }
  }

  async getHtml(url: string): Promise<string> {
    if (!this.account) {
      throw new Error('Not logged in. Call login() first.');
    }
    const response = await this.session.get(url);
    return response.data;
  }

  public getCookies(): string {
    return this.cookies;
  }

  private async getAuthToken(): Promise<string> {
    const response = await this.session.get('/login');
    const html = response.data;
    const match = html.match(/<meta name="csrf-token" content="([^"]+)"/);
    if (!match) {
      throw new Error('Could not find CSRF token');
    }
    return match[1];
  }

  async login(email: string, password: string): Promise<boolean> {
    const auth_token = await this.getAuthToken();

    const formData = new URLSearchParams();
    formData.append('utf8', '✓');
    formData.append('authenticity_token', auth_token);
    formData.append('session[email]', email);
    formData.append('session[password]', password);
    formData.append('session[remember_me]', '0');
    formData.append('commit', 'Log In');
    formData.append('session[remember_me_sso]', '0');

    const response = await this.session.post(`${this.gradescope_base_url}/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Origin': this.gradescope_base_url,
        'Referer': `${this.gradescope_base_url}/login`
      },
      maxRedirects: 0,
      validateStatus: (status) => status === 302
    });

    if (response.status === 302) {
      const redirectUrl = response.headers.location;
      const fullRedirectUrl = redirectUrl.startsWith('http') ? redirectUrl : `${this.gradescope_base_url}${redirectUrl}`;
      const accountResponse = await this.session.get(fullRedirectUrl);
      
      if (accountResponse.status === 200) {
        // Check if we're still on the login page
        if (accountResponse.data.includes('Log in with your Gradescope account')) {
          return false;
        }
        // Initialize account after successful login
        this.account = new Account(this);
        return true;
      }
    }

    return false;
  }
}

// =============================================
// GRADESCOPE ACCOUNT CLASS
// =============================================

class Account {
  private connection: GSConnection;

  constructor(connection: GSConnection) {
    this.connection = connection;
  }

  // Parse date from Gradescope HTML elements
  private parseDate($: cheerio.Root, element: cheerio.Element | null): DateTime | null {
    if (!element) {
      return null;
    }

    const $element = $(element);

    // Try parsing the datetime attribute
    const datetimeAttr = $element.attr('datetime');
    if (datetimeAttr) {
      try {
        const isoString = datetimeAttr.replace(/ ([-+])/, 'T$1');
        const parsed = DateTime.fromISO(isoString);
        if (parsed.isValid) {
          return parsed;
        }
      } catch (e) { /* Ignore parsing errors, try next method */ }
    }

    // Fallback to parsing the human-readable text
    let dateText = $element.text()?.trim();
    if (dateText) {
      try {
        if (dateText.startsWith('Late Due Date: ')) {
          dateText = dateText.substring('Late Due Date: '.length);
        }
        const formatStrings = ["MMM dd 'at' h:mma", "MMM dd 'at'  h:mma"];
        for (const fmt of formatStrings) {
          const parsed = DateTime.fromFormat(dateText, fmt, { zone: 'America/New_York' });
          if (parsed.isValid) {
            return parsed;
          }
        }
      } catch (e) { /* Ignore parsing errors */ }
    }

    return null;
  }

  // Parse course info from HTML elements
  private parseCourseInfo($: cheerio.Root, courseBox: cheerio.Element): GradescopeCourse | null {
    try {
      const $courseBox = $(courseBox);
      const shortNameElement = $courseBox.find('.courseBox--shortname');
      const nameElement = $courseBox.find('.courseBox--name');
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
        name,
        term
      };
    } catch (error) {
      return null;
    }
  }

  async get_courses(): Promise<GradescopeCourseList> {
    const response = await axios.get('https://www.gradescope.com/account', {
      headers: {
        Cookie: this.connection.getCookies()
      }
    });

    const $ = cheerio.load(response.data);

    const courses: GradescopeCourseList = {
      student: {},
      instructor: {}
    };

    // Parse student courses
    $('.courseList--coursesForTerm .courseBox:not(.courseBox-new)').each((index: number, element: cheerio.Element) => {
      const course = this.parseCourseInfo($, element);
      if (course) {
        courses.student[course.id] = course;
      }
    });

    return courses;
  }

  async get_assignments(courseId: string): Promise<GradescopeAssignment[]> {
    const response = await axios.get(`https://www.gradescope.com/courses/${courseId}`, {
      headers: {
        Cookie: this.connection.getCookies()
      }
    });

    const $ = cheerio.load(response.data);
    const assignments: GradescopeAssignment[] = [];

    $('#assignments-student-table tbody tr').each((index: number, rowElement: cheerio.Element) => {
      try {
        const $row = $(rowElement);
        const $nameCell = $row.find('th.table--primaryLink');
        const $anchor = $nameCell.find('a');

        let name: string | undefined = undefined;
        let assignment_id: string | undefined = undefined;
        let submission_id: string | undefined = undefined;

        if ($anchor.length > 0) {
          name = $anchor.text()?.trim();
          const href = $anchor.attr('href');
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
          name = $nameCell.text()?.trim();
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

        const $statusCell = $row.find('td.submissionStatus');
        const $dateCell = $row.find('td:nth-of-type(2)');

        const dueDateElements = $dateCell.find('time.submissionTimeChart--dueDate').get();

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

        const dueDate = dueDateElements.length > 0 ? this.parseDate($, dueDateElements[0]) : null;

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
      } catch (error) {
        // Continue to next row
      }
    });

    return assignments;
  }
}

// Session cache to avoid repeated authentication
const sessionCache = new Map<string, { cookies: string; timestamp: number }>();
const SESSION_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Core authentication function - handles Gradescope's native login method
export async function authenticateGradescope(email: string, password: string): Promise<string> {
  // Check cache first
  const cacheKey = `${email}:${password}`;
  const cached = sessionCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < SESSION_CACHE_DURATION) {
    return cached.cookies;
  }
  const GRADESCOPE_BASE_URL = 'https://www.gradescope.com';
  
  // Create axios session for login
  const session = axios.create({
    baseURL: GRADESCOPE_BASE_URL,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  let cookies = '';

  // Add response interceptor to capture cookies
  session.interceptors.response.use(response => {
    const responseCookies = response.headers['set-cookie'];
    if (responseCookies) {
      // Parse existing cookies into a map
      const cookieMap = new Map();
      if (cookies) {
        cookies.split('; ').forEach(cookie => {
          const [name] = cookie.split('=');
          cookieMap.set(name, cookie);
        });
      }

      // Add new cookies to the map
      responseCookies.forEach(cookie => {
        const [cookieStr] = cookie.split(';');
        const [name] = cookieStr.split('=');
        cookieMap.set(name, cookieStr);
      });

      // Convert map back to cookie string
      cookies = Array.from(cookieMap.values()).join('; ');

      // Update session headers with new cookies
      if (cookies) {
        session.defaults.headers.Cookie = cookies;
      }
    }
    return response;
  });

  try {
    // Get CSRF token
    const loginPageResponse = await session.get('/login');
    const html = loginPageResponse.data;
    const match = html.match(/<meta name="csrf-token" content="([^"]+)"/);
    if (!match) {
      throw new Error('Could not find CSRF token on login page');
    }
    const authToken = match[1];

    // Prepare login form data
    const formData = new URLSearchParams();
    formData.append('utf8', '✓');
    formData.append('authenticity_token', authToken);
    formData.append('session[email]', email);
    formData.append('session[password]', password);
    formData.append('session[remember_me]', '0');
    formData.append('commit', 'Log In');
    formData.append('session[remember_me_sso]', '0');

    // Submit login form
    const loginResponse = await session.post('/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Origin': GRADESCOPE_BASE_URL,
        'Referer': `${GRADESCOPE_BASE_URL}/login`
      },
      maxRedirects: 0,
      validateStatus: (status) => status === 302
    });

    if (loginResponse.status === 302) {
      const redirectUrl = loginResponse.headers.location;
      const fullRedirectUrl = redirectUrl.startsWith('http') ? redirectUrl : `${GRADESCOPE_BASE_URL}${redirectUrl}`;
      const accountResponse = await session.get(fullRedirectUrl);
      
      if (accountResponse.status === 200) {
        // Check if we're still on the login page (login failed)
        if (accountResponse.data.includes('Log In')) {
          throw new Error('Gradescope login failed - invalid credentials');
        }
        
        // Login successful, cache and return session cookies
        sessionCache.set(cacheKey, { cookies, timestamp: Date.now() });
        return cookies;
      }
    }
    
    throw new Error('Gradescope login failed - unexpected response');
    
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gradescope authentication failed: ${error.message}`);
    }
    throw new Error('Gradescope authentication failed: Unknown error');
  }
}

// Core data parsing utilities
export class GradescopeDataParser {
  // Parse date from Gradescope HTML elements
  static parseDate(dateText: string): DateTime | null {
    if (!dateText) return null;
    
    try {
      // Handle "Late Due Date: " prefix
      if (dateText.startsWith('Late Due Date: ')) {
        dateText = dateText.substring('Late Due Date: '.length);
      }
      
      // Try different format strings
      const formatStrings = ["MMM dd 'at' h:mma", "MMM dd 'at'  h:mma"];
      for (const fmt of formatStrings) {
        const parsed = DateTime.fromFormat(dateText, fmt, { zone: 'America/New_York' });
        if (parsed.isValid) {
          return parsed;
        }
      }
      
      // Fallback to ISO parsing
      const parsed = DateTime.fromISO(dateText);
      if (parsed.isValid) {
        return parsed;
      }
    } catch (e) {
      // Ignore parsing errors
    }
    
    return null;
  }
  
  // Parse submission status
  static isSubmitted(status: string): boolean {
    return status === 'Submitted' || 
           status === 'Graded' || 
           status.startsWith('Submitted (') || 
           status.startsWith('Graded (');
  }
}