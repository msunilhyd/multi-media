# Response to Apple Review - Guideline 4.8 (Sign in with Apple Required)

## To Apple App Review Team:

Thank you for your feedback regarding Guideline 4.8 - Login Services.

### Current Implementation

LinusPlaylists currently offers the following login options:
- Email and password authentication
- Google Sign-In

### Planned Implementation

We acknowledge that our app requires Sign in with Apple as an equivalent login option to comply with Guideline 4.8. We will implement Sign in with Apple in our next update to provide users with a privacy-focused login option that:

- Limits data collection to name and email address
- Allows users to keep their email address private
- Does not collect interactions for advertising purposes without consent

### Implementation Timeline

We are committed to adding Sign in with Apple to the app. The implementation requires:

1. Apple Developer Account configuration for Sign in with Apple capability
2. Backend API updates to handle Apple authentication tokens
3. Frontend integration of the Sign in with Apple button
4. Testing on iOS devices

**Estimated completion: 1-2 weeks**

### Request for Approval

We respectfully request approval to proceed with the current build while we implement Sign in with Apple. The core functionality of the app is complete and stable, and Sign in with Apple will be added as an additional login option in the next update.

Alternatively, if required, we can resubmit with Sign in with Apple fully implemented once the development is complete.

Please advise on the preferred approach.

Thank you for your guidance.

Best regards,
LinusPlaylists Development Team

---

## Implementation Notes (Internal)

### Backend Changes Needed (FastAPI):
1. Add Apple OAuth configuration
2. Create endpoint to verify Apple ID tokens: `POST /auth/apple`
3. Extract user info from Apple's JWT token
4. Create or update user in database with Apple ID

### Frontend Changes Needed (React Native):
1. Install: `expo-apple-authentication`
2. Add "Sign in with Apple" button to AuthModal
3. Handle Apple authentication flow
4. Send Apple ID token to backend
5. Store user session

### Expo Configuration:
```json
{
  "ios": {
    "usesAppleSignIn": true
  }
}
```

### app.json:
Add to plugins or config:
```json
"plugins": ["expo-apple-authentication"]
```
