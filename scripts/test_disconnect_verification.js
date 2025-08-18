// scripts/test_disconnect_verification.js
// Test the backend disconnect and debug endpoints

const BASE_URL = 'https://gradeslist-mobile.vercel.app/api/gradescope';

async function testSessionDebug(stage) {
  try {
    console.log(`\n🔍 Testing session debug (${stage})...`);
    
    const response = await fetch(`${BASE_URL}/session/debug?userId=test-user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Session debug (${stage}):`, {
        success: result.success,
        hasSession: result.state.hasSession,
        hasCredentials: result.state.hasCredentials,
        timestamp: result.state.timestamp
      });
      return result;
    } else {
      const error = await response.text();
      console.log(`❌ Session debug (${stage}) failed:`, response.status, error);
      return null;
    }
  } catch (error) {
    console.log(`❌ Session debug (${stage}) error:`, error.message);
    return null;
  }
}

async function testDisconnect() {
  try {
    console.log(`\n🔌 Testing disconnect endpoint...`);
    
    const response = await fetch(`${BASE_URL}/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 'test-user'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Disconnect successful:`, {
        success: result.success,
        message: result.message,
        cleared: result.cleared,
        timestamp: result.timestamp
      });
      return result;
    } else {
      const error = await response.text();
      console.log(`❌ Disconnect failed:`, response.status, error);
      return null;
    }
  } catch (error) {
    console.log(`❌ Disconnect error:`, error.message);
    return null;
  }
}

async function runDisconnectVerificationTests() {
  console.log('🧪 Testing Backend Disconnect Verification\n');
  console.log(`Base URL: ${BASE_URL}`);
  
  // Test 1: Check session state before disconnect
  const beforeState = await testSessionDebug('before disconnect');
  
  // Test 2: Perform disconnect
  const disconnectResult = await testDisconnect();
  
  // Test 3: Check session state after disconnect
  const afterState = await testSessionDebug('after disconnect');
  
  // Summary
  console.log('\n📊 Test Summary:');
  if (beforeState && disconnectResult && afterState) {
    console.log('✅ All endpoints responded successfully');
    console.log(`✅ Before disconnect - Session: ${beforeState.state.hasSession}, Credentials: ${beforeState.state.hasCredentials}`);
    console.log(`✅ Disconnect cleared: ${JSON.stringify(disconnectResult.cleared)}`);
    console.log(`✅ After disconnect - Session: ${afterState.state.hasSession}, Credentials: ${afterState.state.hasCredentials}`);
  } else {
    console.log('❌ Some tests failed - check individual results above');
  }
  
  console.log('\n🎉 Backend disconnect verification tests complete!');
  console.log('\n📋 Next: Test the full disconnect flow in the mobile app');
}

// Run the tests
runDisconnectVerificationTests().catch(console.error);