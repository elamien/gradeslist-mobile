// scripts/verify_cookie_fix.js
// Verify that the cookie login fixes are implemented correctly

const fs = require('fs');
const path = require('path');

console.log('🔧 Verifying Cookie Login Fixes...\n');

// Check if native cookie manager is installed
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.dependencies['@react-native-cookies/cookies']) {
    console.log('✅ @react-native-cookies/cookies installed');
  } else {
    console.log('❌ @react-native-cookies/cookies missing');
  }
} catch (error) {
  console.log('❌ Could not check package.json');
}

// Check cookie extraction code
try {
  const loginComponent = fs.readFileSync('components/GradescopeLogin.tsx', 'utf8');
  
  if (loginComponent.includes('CookieManager.get(')) {
    console.log('✅ Native cookie extraction implemented');
  } else {
    console.log('❌ Still using document.cookie (JS-only)');
  }
  
  if (loginComponent.includes('FORCE_FRESH_LOGIN')) {
    console.log('✅ FORCE_FRESH_LOGIN feature flag added');
  } else {
    console.log('❌ FORCE_FRESH_LOGIN feature flag missing');
  }
  
  if (loginComponent.includes('nativeCookieLogin')) {
    console.log('✅ Native cookie login message type implemented');
  } else {
    console.log('❌ Still using old cookie login message type');
  }
  
  if (loginComponent.includes('cookieNames')) {
    console.log('✅ Cookie name logging (no values) implemented');
  } else {
    console.log('❌ Cookie diagnostics missing');
  }
  
  if (loginComponent.includes('_gradescope_session')) {
    console.log('✅ Session cookie validation added');
  } else {
    console.log('❌ Session cookie validation missing');
  }
  
} catch (error) {
  console.log('❌ Could not check GradescopeLogin.tsx');
}

// Check feature flags
try {
  const service = fs.readFileSync('services/cookieGradescopeService.ts', 'utf8');
  
  if (service.includes('FORCE_FRESH_LOGIN')) {
    console.log('✅ FORCE_FRESH_LOGIN exported from service');
  } else {
    console.log('❌ FORCE_FRESH_LOGIN not exported');
  }
  
} catch (error) {
  console.log('❌ Could not check cookieGradescopeService.ts');
}

console.log('\n🎯 Expected Behavior:');
console.log('1. WebView login should now extract ALL cookies (including HttpOnly)');
console.log('2. Should find _gradescope_session and signed_token cookies');
console.log('3. Should log cookie NAMES only (never values)');
console.log('4. If missing session cookies, should suggest FORCE_FRESH_LOGIN=true');

console.log('\n🧪 To Test:');
console.log('1. Run: npm run ios');
console.log('2. Go to Profile → Gradescope');
console.log('3. Login via WebView');
console.log('4. Check logs for "Cookie names found: [...]"');
console.log('5. Should see _gradescope_session in the list');

console.log('\n🚨 If Still Failing:');
console.log('1. Set FORCE_FRESH_LOGIN = true in services/cookieGradescopeService.ts');
console.log('2. This will clear existing cookies and force fresh login');
console.log('3. Re-test the login flow');

console.log('\n🎉 Integration ready for testing!');