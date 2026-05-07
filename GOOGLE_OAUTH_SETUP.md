# Google OAuth Setup Guide

To enable Google login and registration for your Voice Assistant application, follow these steps:

## 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application"
6. Add authorized JavaScript origins:
   - `http://localhost:3000` (for frontend development)
   - `http://127.0.0.1:3000` (alternative)
7. Add authorized redirect URIs:
   - `http://localhost:3000/login.html`
   - `http://localhost:3000/register.html`
8. Click "Create"
9. Copy the **Client ID** (you'll need this for the next step)

## 2. Update Client Configuration

In `frontend/script.js`, replace the placeholder Client ID:

```javascript
const GOOGLE_CLIENT_ID = 'your-actual-google-client-id-here';
```

Replace with your actual Google Client ID from step 1.

## 3. Test the Implementation

1. Start your backend server:
   ```bash
   cd backend
   python server.py
   ```

2. Start your frontend server:
   ```bash
   cd frontend
   python -m http.server 3000
   ```

3. Navigate to `http://localhost:3000/login.html` or `http://localhost:3000/register.html`

4. Click the Google Sign-In button and test the authentication flow

## Features Implemented

- ✅ Google Sign-In for login
- ✅ Google Sign-Up for registration  
- ✅ Automatic user creation for new Google users
- ✅ User profile picture and name import
- ✅ Seamless integration with existing authentication system
- ✅ Error handling and user feedback

## Security Notes

- Google tokens are validated with Google's API
- User data is stored securely in MongoDB
- No passwords are stored for Google-authenticated users
- Sessions are managed with JWT-like tokens

## Troubleshooting

**"Google login coming soon!" message:**
- Make sure you've replaced the placeholder Client ID
- Check that the Google OAuth script is loading properly

**"Invalid Google token" error:**
- Verify your Google Cloud Console configuration
- Ensure authorized origins and redirect URIs match your setup

**Backend errors:**
- Make sure the `requests` library is installed
- Check that MongoDB is running
- Verify backend server is accessible

## Production Deployment

For production deployment:
1. Update authorized origins to your production domain
2. Use HTTPS (required for production OAuth)
3. Consider adding domain verification
4. Update environment variables for Client ID
