# LifePlace App Links Worker

Cloudflare Worker that serves Apple App Site Association and Android assetlinks.json files for mobile deep linking.

## Setup Instructions

### 1. Install Wrangler CLI (if not installed)
```bash
npm install -g wrangler
```

### 2. Authenticate with Cloudflare
```bash
wrangler login
```

### 3. Deploy the Worker
```bash
cd cloudflare-workers/app-links
wrangler deploy
```

### 4. Configure Custom Domain
After deploying:
1. Go to Cloudflare Dashboard → Workers & Pages
2. Click on `lifeplace-app-links` worker
3. Go to Settings → Triggers → Custom Domains
4. Add Custom Domain: `app.lifeplace.dev`

### 5. Update Configuration Values

Edit `src/index.js` and update the CONFIG object:

#### iOS (when you have Apple Developer account):
```javascript
ios: {
  teamId: 'YOUR_TEAM_ID',  // From Apple Developer Account → Membership
  bundleId: 'com.lifeplace.app',
}
```

#### Android (when you have signing key):
Get your SHA-256 fingerprint:
```bash
# Option 1: Using EAS
eas credentials --platform android

# Option 2: Using keytool (if you have the keystore)
keytool -list -v -keystore your-keystore.jks -alias your-alias | grep SHA256
```

Then update:
```javascript
android: {
  packageName: 'com.lifeplace.app',
  sha256Fingerprints: [
    'AA:BB:CC:...:ZZ',  // Your actual fingerprint
  ],
}
```

### 6. Redeploy After Changes
```bash
wrangler deploy
```

## Testing

### Verify AASA (iOS)
```bash
curl https://app.lifeplace.dev/.well-known/apple-app-site-association
```

### Verify Asset Links (Android)
```bash
curl https://app.lifeplace.dev/.well-known/assetlinks.json
```

### Health Check
```bash
curl https://app.lifeplace.dev/health
```

## Validation Tools

- **iOS**: https://search.developer.apple.com/appsearch-validation-tool/
- **Android**: https://developers.google.com/digital-asset-links/tools/generator

## Troubleshooting

### iOS Universal Links not working
1. Ensure Team ID is correct (10 characters)
2. Clear Safari cache and restart device
3. Check AASA is accessible without redirects
4. Associated Domains in app.json must match exactly

### Android App Links not working
1. Verify SHA-256 fingerprint matches signing key
2. Ensure `autoVerify: true` in app.json intentFilters
3. Use Android Studio's App Links Assistant to debug
