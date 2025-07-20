// Test script to simulate mobile app connection
const fetch = require('node-fetch');

async function testConnection() {
  const url = 'http://192.168.0.250:3001/api/gradescope/test';
  
  console.log(`Testing connection to: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (!response.ok) {
      console.log('Expected error - server is working correctly');
    }
    
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

testConnection();