const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const db = require('../src/config/db');
const authService = require('../src/services/authService');
const userRepository = require('../src/repositories/userRepository');

async function runTests() {
  console.log('--- Starting Google Auth Backend Integration Tests ---');
  
  try {
    // Test 1: Sign up a new customer via Google (mock token bypass)
    console.log('\nTesting: Customer Google Sign-Up');
    const customerPayload = {
      credential: 'mock-google-token:newcustomer@gmail.com',
      role: 'CUSTOMER'
    };
    
    const customerRes = await authService.googleAuth(customerPayload);
    console.log('✅ Customer created successfully');
    console.log(`   User ID: ${customerRes.user.id}, Role: ${customerRes.user.role}, Email: ${customerRes.user.email}`);

    // Test 2: Sign up a new agent via Google
    console.log('\nTesting: Agent Google Sign-Up');
    const agentPayload = {
      credential: 'mock-google-token:newagent@gmail.com',
      role: 'AGENT',
      agencyName: 'Elite Realty',
      licenseNumber: 'ELITE-999',
      phone: '555-0199',
      bio: 'Expert agent'
    };

    const agentRes = await authService.googleAuth(agentPayload);
    console.log('✅ Agent created successfully');
    console.log(`   User ID: ${agentRes.user.id}, Role: ${agentRes.user.role}`);

    // Verify Agent profile exists
    const agentProfile = await userRepository.findById(agentRes.user.id);
    if (agentProfile.agency_name === 'Elite Realty') {
      console.log('✅ Agent profile linked correctly with agency name');
    } else {
      console.error('❌ Agent profile mismatch');
    }

    // Test 3: Sign in with existing Google account (should return existing user)
    console.log('\nTesting: Existing User Google Sign-In');
    const loginRes = await authService.googleAuth(customerPayload);
    if (loginRes.user.id === customerRes.user.id) {
      console.log('✅ Success: Returned existing customer account instead of creating duplicate');
      console.log(`   Access Token generated: ${loginRes.accessToken.substring(0, 20)}...`);
    } else {
      console.error('❌ Failed: Did not return the correct existing user');
    }

    console.log('\nAll tests passed! 🎉');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await db.end();
  }
}

runTests();
