// get_cookie_for_QA.mjs
// Login to Gradescope and extract session cookies for testing

import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function getCookieForQA() {
  const email = process.env.GRADESCOPE_EMAIL;
  const password = process.env.GRADESCOPE_PASSWORD;

  if (!email || !password) {
    console.error('Missing GRADESCOPE_EMAIL or GRADESCOPE_PASSWORD in .env.local');
    process.exit(1);
  }

  console.log('=== Gradescope Cookie Extraction for QA ===');
  console.log('Email:', email.replace(/(.{3}).*(@.*)/, '$1***$2'));

  try {
    // Create axios instance with cookie jar support
    const jar = new CookieJar();
    const client = wrapper(axios.create({ 
      jar,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }));

    console.log('\n1. Fetching login page for CSRF token...');
    const loginPageResponse = await client.get('https://www.gradescope.com/login');
    
    // Extract CSRF token
    const html = loginPageResponse.data;
    const csrfMatch = html.match(/<meta name="csrf-token" content="([^"]+)"/);
    
    if (!csrfMatch) {
      throw new Error('Could not find CSRF token on login page');
    }
    
    const csrfToken = csrfMatch[1];
    console.log('✓ CSRF token extracted');

    console.log('\n2. Submitting login form...');
    const formData = new URLSearchParams();
    formData.append('utf8', '✓');
    formData.append('authenticity_token', csrfToken);
    formData.append('session[email]', email);
    formData.append('session[password]', password);
    formData.append('session[remember_me]', '0');
    formData.append('commit', 'Log In');
    formData.append('session[remember_me_sso]', '0');

    const loginResponse = await client.post('https://www.gradescope.com/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Origin': 'https://www.gradescope.com',
        'Referer': 'https://www.gradescope.com/login'
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 400 // Accept redirects
    });

    console.log('✓ Login submitted, status:', loginResponse.status);

    console.log('\n3. Verifying login success...');
    const accountResponse = await client.get('https://www.gradescope.com/account');
    
    if (accountResponse.status === 200) {
      // Check if we're actually logged in (not redirected to login)
      if (accountResponse.data.includes('Log In') || accountResponse.data.includes('Sign In')) {
        throw new Error('Login failed - still on login page');
      }
      console.log('✓ Login successful - account page accessible');
    } else {
      throw new Error(`Account page returned status: ${accountResponse.status}`);
    }

    console.log('\n4. Extracting session cookies...');
    const cookies = await jar.getCookies('https://www.gradescope.com');
    console.log('✓ Found', cookies.length, 'cookies');

    // Format cookies as header string
    const cookieHeader = cookies.map(cookie => `${cookie.key}=${cookie.value}`).join('; ');
    
    // Redact cookie values for safe logging
    const redactedHeader = cookies.map(cookie => `${cookie.key}=***`).join('; ');
    
    console.log('\n=== RESULT ===');
    console.log('Cookie header (redacted):', redactedHeader);
    console.log('\n⚠️  IMPORTANT: Copy this to .env.local as COOKIE_HEADER for the next test:');
    console.log('COOKIE_HEADER="' + cookieHeader + '"');
    
    console.log('\n✅ SUCCESS: Session cookies extracted successfully');
    
  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status text:', error.response.statusText);
      
      // Safe preview of response body
      let bodyPreview = '';
      if (typeof error.response.data === 'string') {
        bodyPreview = error.response.data.slice(0, 300);
      }
      console.error('Body preview:', bodyPreview);
    }
    
    process.exit(1);
  }
}

getCookieForQA();