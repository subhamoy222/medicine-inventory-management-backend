import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Test function to check client purchase history endpoint
const testClientPurchaseHistory = async () => {
  try {
    // Replace with your actual token
    const token = 'your_actual_jwt_token_here';
    
    // Create URL with explicitly encoded parameters
    const partyName = encodeURIComponent('ABC Pharmaceuticals');
    const email = encodeURIComponent('subhamsasmal396@gmail.com');
    
    const url = `http://localhost:3000/api/expiry-bills/client-purchase-history?partyName=${partyName}&email=${email}`;
    
    console.log('Making request to URL:', url);
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Error Status:', error.response.status);
      console.error('Error Data:', error.response.data);
    }
  }
};

// Run the test
testClientPurchaseHistory(); 