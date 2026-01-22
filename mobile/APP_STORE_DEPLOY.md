# App Store Deployment Guide

## Prerequisites Checklist

Before deploying to the App Store, ensure you have:

- ✅ Apple Developer Account ($99/year)
- ✅ Access to App Store Connect
- ✅ App icons and screenshots prepared
- ✅ Privacy Policy URL (required for App Store)
- ✅ App description and marketing materials
- ✅ EAS CLI installed globally

## Step 1: Install EAS CLI (if not already installed)

```bash
npm install -g eas-cli
```

## Step 2: Login to EAS

```bash
eas login
```

## Step 3: Configure App Store Credentials

Link your Apple Developer account:

```bash
eas credentials
```

Choose iOS, then configure:
- Distribution Certificate
- Provisioning Profile
- Push Notification Key (if using push notifications)

## Step 4: Update App Configuration

Ensure your `app.json` has all required information:

- ✅ Bundle Identifier: `com.sunil.music-player`
- ✅ Version: `1.0.0`
- ✅ Icon: `./assets/icon.png`
- ✅ Privacy: `ITSAppUsesNonExemptEncryption: false`

## Step 5: Build for Production

Build the iOS app for production:

```bash
cd /Users/s0m13i5/linus/multi-media/mobile
eas build --platform ios --profile production
```

This will:
1. Upload your code to EAS servers
2. Build the app on Apple's infrastructure
3. Generate an `.ipa` file
4. Provide a download link

Build typically takes 10-20 minutes.

## Step 6: Submit to App Store

After the build completes, submit to App Store:

```bash
eas submit --platform ios --latest
```

Or manually:
1. Download the `.ipa` file from the EAS build page
2. Upload to App Store Connect using Transporter app
3. Or use `eas submit --platform ios --path ./path/to/app.ipa`

## Step 7: App Store Connect Configuration

Go to https://appstoreconnect.apple.com/ and:

1. **Create New App**
   - Click "+" → "New App"
   - Select iOS
   - App Name: "Music Player"
   - Bundle ID: `com.sunil.music-player`
   - SKU: Choose a unique identifier

2. **App Information**
   - Category: Music or Entertainment
   - Privacy Policy URL (required)
   - Support URL

3. **Pricing and Availability**
   - Set pricing (Free or Paid)
   - Select countries/regions

4. **Prepare for Submission**
   - **Screenshots Required:**
     - 6.7" iPhone (iPhone 15 Pro Max): 1320 x 2868 pixels
     - 6.5" iPhone (iPhone 11 Pro Max): 1242 x 2688 pixels
     - 5.5" iPhone (iPhone 8 Plus): 1242 x 2208 pixels
   - **App Preview Video** (optional but recommended)
   - **Description** (4000 characters max)
   - **Keywords** (100 characters)
   - **What's New** (version notes)

5. **Build**
   - After `eas submit`, wait 5-10 minutes for build to process
   - Select the build from the build dropdown

6. **Age Rating**
   - Complete the questionnaire

7. **App Review Information**
   - Contact info
   - Demo account (if app requires login)
   - Notes for reviewer

8. **Version Release**
   - Manual or Automatic release

9. **Submit for Review**
   - Click "Submit for Review"

## Step 8: Review Process

- Review typically takes 24-48 hours
- Check email for updates
- Respond to any feedback from Apple reviewers

## Common Issues & Solutions

### Issue: Missing Export Compliance
**Solution:** Already configured in `app.json` with `ITSAppUsesNonExemptEncryption: false`

### Issue: Missing Privacy Policy
**Solution:** Create a privacy policy page and add URL in App Store Connect

### Issue: Screenshots Missing
**Solution:** Use iOS Simulator or device to capture screenshots at required resolutions

### Issue: App Name Already Taken
**Solution:** Choose a different name or add suffix (e.g., "Music Player Pro")

### Issue: Build Failed
**Solution:** Check EAS build logs with `eas build:list` and click on the build

## Testing Before Submission

### TestFlight (Recommended)

1. After build completes, enable TestFlight in App Store Connect
2. Add internal testers (up to 100)
3. Share TestFlight link
4. Get feedback before public release

```bash
# Build is automatically available in TestFlight after eas submit
```

## Update Versioning

For future updates:

1. Update version in `app.json`:
   ```json
   "version": "1.0.1"
   ```

2. Update `ios.buildNumber` if needed:
   ```json
   "ios": {
     "buildNumber": "2"
   }
   ```

3. Run build again:
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios --latest
   ```

## Useful Commands

```bash
# View all builds
eas build:list

# View build details
eas build:view [BUILD_ID]

# Check submission status
eas submit:list

# View credentials
eas credentials

# Update app in App Store Connect
eas update

# Run locally for testing
npm run ios
```

## App Store Optimization (ASO)

- **App Name:** Keep it under 30 characters
- **Subtitle:** 30 characters to describe your app
- **Keywords:** Research popular search terms (100 chars)
- **Icon:** Should be clear and recognizable at small sizes
- **Screenshots:** Show key features, add text overlays
- **Preview Video:** Show app in action (30 seconds recommended)

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [App Store Connect Guide](https://developer.apple.com/app-store-connect/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

## Next Steps

1. Verify all prerequisites are met
2. Run `eas build --platform ios --profile production`
3. Monitor build progress at https://expo.dev
4. Submit to App Store with `eas submit --platform ios --latest`
5. Complete App Store Connect configuration
6. Submit for review
7. Wait for approval (24-48 hours typically)
