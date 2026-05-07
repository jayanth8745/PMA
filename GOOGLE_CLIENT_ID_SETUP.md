# Google Client ID Setup Guide

## 🚨 IMPORTANT: Replace the Google Client ID

Your voice assistant currently has a placeholder Google Client ID that needs to be replaced with your actual credentials.

## 📋 Steps to Get Your Google Client ID

### 1. Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Sign in with your Google account

### 2. Create/Select a Project
- Create a new project or select an existing one
- Project name: "Voice Assistant" or similar

### 3. Enable Google+ API
- Go to "APIs & Services" > "Library"
- Search for "Google+ API" or "People API"
- Click "Enable"

### 4. Create OAuth Credentials
- Go to "APIs & Services" > "Credentials"
- Click "Create Credentials" > "OAuth client ID"
- Select "Web application"

### 5. Configure OAuth Settings
**Authorized JavaScript origins:**
- `http://localhost:3000`
- `http://127.0.0.1:3000`

**Authorized redirect URIs:**
- `http://localhost:3000/login.html`
- `http://localhost:3000/register.html`

### 6. Get Your Client ID
- After creating, you'll see your "Client ID"
- Copy this ID (it looks like: `123456789-abcdef...apps.googleusercontent.com`)

### 7. Update Your Application
Open `frontend/script.js` and replace the placeholder:

**Find this line:**
```javascript
const GOOGLE_CLIENT_ID = '123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com'; // REPLACE with your actual Google Client ID
```

**Replace with:**
```javascript
const GOOGLE_CLIENT_ID = 'your-actual-client-id-here'; // Your real Google Client ID
```

## 🧪 Test Google Login

After updating the Client ID:

1. **Start the application:**
   ```bash
   python start_app.py
   ```

2. **Open browser:** http://localhost:3000/login.html

3. **Test Google Login:**
   - Click the "Sign in with Google" button
   - Should open Google's OAuth popup
   - Select your Google account
   - Should redirect back to dashboard

4. **Test Google Register:**
   - Go to http://localhost:3000/register.html
   - Click "Sign up with Google"
   - Should create new account or login existing

## 🔧 Troubleshooting

**"invalid_client" error:**
- Check that your Client ID is exactly correct (no extra spaces)
- Verify authorized origins include `http://localhost:3000`

**"redirect_uri_mismatch" error:**
- Check that redirect URIs match exactly
- Include both login.html and register.html

**Google button not showing:**
- Check browser console for errors
- Verify Google OAuth script is loading
- Check that Client ID is set correctly

**Popup blocked:**
- Allow popups for localhost in your browser
- Try a different browser if needed

## 📱 What Google Login Provides

When users login with Google, they get:
- ✅ No password required
- ✅ Profile picture imported
- ✅ Name imported from Google
- ✅ Email verified automatically
- ✅ Secure authentication

## 🔐 Security Notes

- Never share your Client Secret (only needed for server-side)
- Client ID is safe to include in frontend code
- Regular users cannot abuse your Client ID
- Google handles all authentication securely

## 🚀 Next Steps

1. Get your Google Client ID following the steps above
2. Update the placeholder in `frontend/script.js`
3. Test both login and registration
4. Your voice assistant will have full Google OAuth integration!
