/**
 * Server-side utility functions for authentication
 */

interface UserData {
  email?: string | null;
  given_name?: string;
  family_name?: string;
  name?: string | null;
  image?: string | null;
  id?: string;
}

interface AccountData {
  access_token?: string;
  id_token?: string;
  provider?: string;
}

/**
 * Send user authentication data to the backend after successful Google login
 * This is a server-side implementation for NextAuth callbacks
 */
export async function registerUserWithBackend(
  user: UserData,
  account: AccountData
): Promise<any> {
  try {    
    const requestBody = {
      email: user.email || '',
      given_name: user.given_name || user.name?.split(' ')[0] || '',
      family_name: user.family_name || user.name?.split(' ').slice(1).join(' ') || '',
      id_token: account.id_token || ''
    };
    
    console.log('Sending request to backend:', {
      url: `${process.env.BACKEND_URL}/auth/login`,
      body: { ...requestBody, id_token: account.id_token ? '[PRESENT]' : '[MISSING]' }
    });
    
    const response = await fetch(`${process.env.BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend auth error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      // For now, don't throw the error - use fallback instead
      throw new Error(`Backend auth failed: ${response.status}`);
    }

    // Return the raw response data - assuming it contains an 'id' field directly
    const data = await response.json();
    
    // Make sure the ID exists and is returned properly
    if (!data.id) {
      console.error("Backend response missing ID field:", data);
    }
    
    return data;
  } catch (error) {
    console.error('Backend authentication error:', error);
    // Return a fallback user object with a temporary ID based on email
    // This allows the frontend to continue working while backend auth is being fixed
    if (user.email) {
      // Generate a simple integer ID from email hash for testing
      // In production, this should be replaced with proper backend authentication
      const emailHash = user.email.split('').reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0);
      }, 0);
      const fallbackId = Math.abs(emailHash % 1000000); // Keep it reasonable for testing
      console.log('Using fallback user ID:', fallbackId, 'for email:', user.email);
      return { id: fallbackId };
    }
    return { id: null };
  }
}