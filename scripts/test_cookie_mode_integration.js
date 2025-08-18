// scripts/test_cookie_mode_integration.js
// Test the complete cookie mode integration

const { getGradescopeClient } = require('../integrations/gradescopeClient.ts');

// Mock credentials for testing
const cookieCredentials = {
  cookies: '_gradescope_session=test123; signed_token=test456',
  loginData: {
    cookieBased: true,
    coursesCount: 3,
    assignmentsCount: 24
  }
};

const serverCredentials = {
  username: 'test@example.com',
  password: 'testpass'
};

console.log('🧪 Testing Gradescope Client Factory...\n');

// Test 1: Cookie mode detection
console.log('Test 1: Cookie mode detection');
try {
  const cookieClient = getGradescopeClient(cookieCredentials);
  console.log(`✅ Cookie client mode: ${cookieClient.mode}`);
  console.log(`✅ Cookie client has fetchCourses: ${typeof cookieClient.fetchCourses === 'function'}`);
  console.log(`✅ Cookie client has fetchAssignments: ${typeof cookieClient.fetchAssignments === 'function'}`);
} catch (error) {
  console.log(`❌ Cookie client test failed: ${error.message}`);
}

console.log();

// Test 2: Server mode detection
console.log('Test 2: Server mode detection');
try {
  const serverClient = getGradescopeClient(serverCredentials);
  console.log(`✅ Server client mode: ${serverClient.mode}`);
  console.log(`✅ Server client has fetchCourses: ${typeof serverClient.fetchCourses === 'function'}`);
  console.log(`✅ Server client has fetchAssignments: ${typeof serverClient.fetchAssignments === 'function'}`);
} catch (error) {
  console.log(`❌ Server client test failed: ${error.message}`);
}

console.log();

// Test 3: Invalid credentials (should default to server)
console.log('Test 3: Invalid credentials');
try {
  const invalidClient = getGradescopeClient({});
  console.log(`✅ Invalid credentials default to mode: ${invalidClient.mode}`);
} catch (error) {
  console.log(`❌ Invalid credentials test failed: ${error.message}`);
}

console.log('\n🎉 Gradescope Client Factory tests complete!');
console.log('\n📋 Next: Run npm run ios and test the full flow');