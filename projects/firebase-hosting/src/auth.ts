import { GoogleAuth } from 'google-auth-library';

const SCOPES = [
  'https://www.googleapis.com/auth/firebase.hosting.readonly',
  'https://www.googleapis.com/auth/firebase.storage'
];

const auth = new GoogleAuth({ scopes: SCOPES });

export async function getAccessToken(): Promise<string> {
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse?.token;

  if (!token) {
    throw new Error('Failed to obtain access token from GOOGLE_APPLICATION_CREDENTIALS');
  }

  return token;
}
