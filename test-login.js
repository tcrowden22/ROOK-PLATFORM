// Simple login test script
const testLogin = async () => {
  const API_URL = process.env.VITE_API_URL || 'http://localhost:8000';
  
  console.log('Testing login at:', `${API_URL}/api/auth/login`);
  
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@rook.local',
        password: 'test'
      }),
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Login successful!');
      return true;
    } else {
      console.log('❌ Login failed:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
};

testLogin();

