// validate_cookie_only.mjs
// Test if session cookies alone can access Gradescope account without credentials

import axios from 'axios';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function validateCookieOnly() {
  const cookieHeader = process.env.COOKIE_HEADER;

  if (!cookieHeader) {
    console.error('Missing COOKIE_HEADER in .env.local');
    console.error('Run get_cookie_for_QA.mjs first to obtain the cookie header');
    process.exit(1);
  }

  console.log('=== Gradescope Cookie-Only Validation ===');
  
  // Redact cookie values for safe logging
  const redactedCookies = cookieHeader
    .split('; ')
    .map(cookie => {
      const [name] = cookie.split('=');
      return `${name}=***`;
    })
    .join('; ');
  
  console.log('Testing with cookies:', redactedCookies);

  try {
    console.log('\n1. Testing account page access with cookies only...');
    
    const response = await axios.get('https://www.gradescope.com/account', {
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 15000,
      maxRedirects: 0, // Don't follow redirects to detect login redirects
      validateStatus: (status) => status < 400 // Accept 2xx and 3xx
    });

    console.log('✓ Response status:', response.status);

    if (response.status === 200) {
      // Check if the response is actually the account page (not login page)
      const responseText = response.data;
      
      if (responseText.includes('Log In') || responseText.includes('Sign In')) {
        console.log('❌ NOT VALID: Response contains login form - session expired');
        console.log('Response appears to be login page despite 200 status');
        process.exit(1);
      }
      
      // Look for account page indicators
      const hasAccountIndicators = 
        responseText.includes('Account') ||
        responseText.includes('Courses') ||
        responseText.includes('courseBox') ||
        responseText.includes('Dashboard');

      if (hasAccountIndicators) {
        console.log('✅ OK: Cookie-only session is valid.');
        console.log('✓ Account page accessible with session cookies');
        console.log('✓ No credentials needed for subsequent requests');
        
        // Test course list extraction
        console.log('\n2. Testing course data extraction...');
        const courseMatches = responseText.match(/courseBox/g);
        if (courseMatches) {
          console.log('✓ Found', courseMatches.length, 'course elements in page');
        }
        
        console.log('\n🎉 SUCCESS: Session cookies provide full access to Gradescope');
        console.log('This proves we can scrape data without storing user credentials!');
        
      } else {
        console.log('⚠️  UNCERTAIN: Got 200 response but no clear account indicators');
        console.log('Response body preview (first 200 chars):');
        console.log(responseText.slice(0, 200));
      }
      
    } else if (response.status >= 300 && response.status < 400) {
      console.log('❌ NOT VALID: Redirected (status', response.status, ')');
      console.log('Likely redirected to login page - session expired');
      if (response.headers.location) {
        console.log('Redirect location:', response.headers.location);
      }
      process.exit(1);
      
    } else {
      console.log('❌ NOT VALID: Unexpected status', response.status);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ VALIDATION FAILED');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status text:', error.response.statusText);
      
      if (error.response.status === 302 || error.response.status === 301) {
        console.error('❌ NOT VALID: Redirected to login - session expired');
        if (error.response.headers.location) {
          console.error('Redirect location:', error.response.headers.location);
        }
      }
      
    } else if (error.code) {
      console.error('Network error:', error.code);
      console.error('Message:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    
    process.exit(1);
  }
}

validateCookieOnly();