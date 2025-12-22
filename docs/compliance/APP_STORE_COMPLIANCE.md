# App Store Privacy Compliance Guide

## Overview
This document provides the privacy declarations required for iOS App Store and Google Play Store submission, based on the LifePlace data inventory and Philippines DPA requirements.

---

## 1. iOS App Store - App Privacy Details

### 1.1 Privacy Nutrition Labels Overview

Apple requires developers to disclose:
1. **Data Used to Track You** - Data linked to your identity for tracking across apps
2. **Data Linked to You** - Data connected to your identity
3. **Data Not Linked to You** - Anonymous/aggregated data

Reference: [App Privacy Details - Apple Developer](https://developer.apple.com/app-store/app-privacy-details/)

---

### 1.2 LifePlace iOS Privacy Label Declarations

Based on the data inventory in `DATA_INVENTORY.md`, here are the required declarations:

#### Contact Info

| Data Type | Collected | Linked to Identity | Used for Tracking |
|-----------|-----------|-------------------|-------------------|
| **Name** | Yes | Yes | No |
| **Email Address** | Yes | Yes | No |
| **Phone Number** | Yes | Yes | No |

**Purposes:**
- App Functionality
- Account registration and login
- Booking confirmations
- Marketing (if consented)

#### Identifiers

| Data Type | Collected | Linked to Identity | Used for Tracking |
|-----------|-----------|-------------------|-------------------|
| **User ID** | Yes | Yes | No |
| **Device ID** | Yes | Yes | No |

**Purposes:**
- App Functionality
- Push notifications
- Analytics

#### Financial Info

| Data Type | Collected | Linked to Identity | Used for Tracking |
|-----------|-----------|-------------------|-------------------|
| **Payment Info** | No (Stripe handles) | N/A | N/A |
| **Other Financial** | Yes (invoices) | Yes | No |

**Note:** Credit card details are NOT collected by LifePlace - processed directly by Stripe.

**Purposes:**
- App Functionality
- Payment processing

#### Location

| Data Type | Collected | Linked to Identity | Used for Tracking |
|-----------|-----------|-------------------|-------------------|
| **Precise Location** | No | N/A | N/A |
| **Coarse Location** | No | N/A | N/A |

**Note:** LifePlace does not collect location data.

#### Usage Data

| Data Type | Collected | Linked to Identity | Used for Tracking |
|-----------|-----------|-------------------|-------------------|
| **Product Interaction** | Yes | Yes (if logged in) | No |

**Purposes:**
- Analytics
- App improvement

#### Sensitive Info

| Data Type | Collected | Linked to Identity | Used for Tracking |
|-----------|-----------|-------------------|-------------------|
| **Health** | Potentially (dietary restrictions in questionnaires) | Yes | No |
| **Religious/Philosophical Beliefs** | Potentially (event questionnaires) | Yes | No |

**Purposes:**
- App Functionality (event planning)

**Note:** Collected only through voluntary questionnaire responses with explicit consent.

#### Other Data

| Data Type | Collected | Linked to Identity | Used for Tracking |
|-----------|-----------|-------------------|-------------------|
| **Signature Data** | Yes | Yes | No |
| **Event Details** | Yes | Yes | No |

**Purposes:**
- App Functionality
- Contract management

---

### 1.3 iOS Privacy Manifest (iOS 17+)

Starting with iOS 17, apps must include a privacy manifest file.

Create `PrivacyInfo.xcprivacy` in your iOS project:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyTrackingDomains</key>
    <array/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeName</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeEmailAddress</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypePhoneNumber</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeUserID</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
                <string>NSPrivacyCollectedDataTypePurposeAnalytics</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeDeviceID</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeProductInteraction</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAnalytics</string>
            </array>
        </dict>
    </array>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

---

### 1.4 App Tracking Transparency (ATT)

#### Does LifePlace Need ATT?

**No** - LifePlace does NOT require ATT prompt because:
- We do not track users across other apps/websites
- We do not use IDFA for advertising
- We do not share data with advertising networks
- Analytics are first-party only

#### If Marketing Tracking is Added Later

If third-party advertising is added, implement ATT:

```typescript
// src/utils/tracking.ts
import { requestTrackingPermissionsAsync, getTrackingPermissionsAsync } from 'expo-tracking-transparency';

export const requestTrackingPermission = async (): Promise<boolean> => {
  const { status } = await getTrackingPermissionsAsync();

  if (status === 'undetermined') {
    const { status: newStatus } = await requestTrackingPermissionsAsync();
    return newStatus === 'granted';
  }

  return status === 'granted';
};
```

Add to `app.json`:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSUserTrackingUsageDescription": "We use this to provide personalized event recommendations and measure ad effectiveness."
      }
    },
    "plugins": [
      "expo-tracking-transparency"
    ]
  }
}
```

---

## 2. Google Play - Data Safety Section

### 2.1 Overview

Google Play requires all apps to complete the Data Safety form, even if no data is collected.

Reference: [Provide information for Google Play's Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)

---

### 2.2 LifePlace Google Play Data Safety Responses

#### Section 1: Data Collection & Security

| Question | Answer |
|----------|--------|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Do you provide a way for users to request that their data is deleted? | **Yes** |

#### Section 2: Data Types Collected

##### Personal Info

| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| **Name** | Yes | No | App functionality, Account management |
| **Email address** | Yes | No | App functionality, Account management, Marketing (with consent) |
| **Phone number** | Yes | No | App functionality, Account management |

##### Financial Info

| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| **User payment info** | No | N/A | N/A |
| **Purchase history** | Yes | No | App functionality |

**Note:** Credit card details are processed by Stripe (Payment PSP), not collected by LifePlace.

##### App Activity

| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| **App interactions** | Yes | No | Analytics |
| **In-app search history** | No | N/A | N/A |
| **Other user-generated content** | Yes | No | App functionality (questionnaires, signatures) |

##### Device or Other IDs

| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| **Device or other IDs** | Yes | No | App functionality (push notifications) |

##### Health and Fitness

| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| **Health info** | Yes (dietary restrictions) | No | App functionality |

**Note:** Only collected through voluntary questionnaire responses.

---

### 2.3 Data Safety Form - Complete Responses

Use these responses when filling out the Google Play Console Data Safety form:

```
OVERVIEW
========
Does your app collect or share any of the required user data types?
→ Yes

Is all of the user data collected by your app encrypted in transit?
→ Yes

Do you provide a way for users to request that their data is deleted?
→ Yes

DATA COLLECTION
===============
Personal info:
- Name: Collected, Not shared
  - Purpose: App functionality, Account management
  - Optional: No (required for account)

- Email address: Collected, Not shared
  - Purpose: App functionality, Account management
  - Optional: No (required for account)

- Phone number: Collected, Not shared
  - Purpose: App functionality
  - Optional: Yes (for optional SMS notifications)

Financial info:
- Purchase history: Collected, Not shared
  - Purpose: App functionality
  - Optional: No (tied to bookings)

App activity:
- App interactions: Collected, Not shared
  - Purpose: Analytics
  - Optional: No

- Other user-generated content: Collected, Not shared
  - Purpose: App functionality
  - Optional: No

Device or other IDs:
- Device or other IDs: Collected, Not shared
  - Purpose: App functionality (push notifications)
  - Optional: Yes (for push notifications)

Health and fitness:
- Health info: Collected, Not shared
  - Purpose: App functionality (event dietary requirements)
  - Optional: Yes (only if user provides in questionnaire)

DATA SHARING
============
We do not share any user data with third parties for advertising purposes.

Third-party services that receive data as part of app functionality:
- Stripe (payment processing)
- Expo (push notifications)
- Brevo (email delivery)

These are service providers, not data sharing for their own purposes.

DATA HANDLING PRACTICES
=======================
Data encrypted in transit: Yes (HTTPS/TLS)
Data encrypted at rest: Yes (sensitive data)
Request data deletion: Yes (in-app and via support)
Independent security review: Internal (pending external audit)
```

---

### 2.4 Privacy Policy Link

Ensure your privacy policy is accessible at a public URL and covers:

1. What data is collected
2. How data is used
3. Data sharing practices
4. User rights (access, correction, deletion)
5. Contact information
6. DPA compliance statement (for Philippines)

Recommended URL structure:
- Main: `https://lifeplace.com/privacy`
- Mobile-specific: `https://lifeplace.com/mobile-privacy`

---

## 3. Third-Party SDK Disclosures

### SDKs Used in LifePlace Mobile App

| SDK | Data Collected | Purpose | Privacy Policy |
|-----|---------------|---------|----------------|
| **Expo** | Push tokens, device info | Push notifications | [Expo Privacy](https://expo.dev/privacy) |
| **Stripe** | Payment info | Payment processing | [Stripe Privacy](https://stripe.com/privacy) |
| **Sentry** | Error logs, device info | Crash reporting | [Sentry Privacy](https://sentry.io/privacy/) |
| **React Native** | None directly | App framework | N/A |

### SDK Privacy Manifest Requirements (iOS)

For iOS 17+, ensure all third-party SDKs include their own privacy manifests. Expo handles this for its core SDKs.

Check SDK documentation for privacy manifest support:
- expo-notifications: Included
- expo-secure-store: Included
- stripe-react-native: Verify current status

---

## 4. Pre-Submission Checklist

### iOS App Store

- [ ] Privacy Nutrition Labels completed in App Store Connect
- [ ] All data types accurately declared
- [ ] Third-party SDK data collection included
- [ ] Privacy Policy URL provided and accessible
- [ ] PrivacyInfo.xcprivacy file included (iOS 17+)
- [ ] ATT prompt implemented (if tracking users)
- [ ] Purpose strings for sensitive permissions (camera, location, etc.)
- [ ] Data collection purposes accurately described
- [ ] Health data declared if questionnaires collect it

### Google Play Store

- [ ] Data Safety form completed in Play Console
- [ ] All data types accurately declared
- [ ] Data sharing section accurately completed
- [ ] Privacy Policy URL provided and accessible
- [ ] Security practices accurately described
- [ ] Data deletion process documented
- [ ] Health data declared if questionnaires collect it

---

## 5. Ongoing Maintenance

### When to Update Declarations

Update app store privacy declarations when:

1. **New features** that collect additional data
2. **New SDKs** added to the app
3. **Changed data practices** (new sharing, new purposes)
4. **Privacy policy updates** that affect data handling
5. **Regulatory changes** requiring new disclosures

### Quarterly Review Process

1. Review current data collection against declarations
2. Check third-party SDK updates for privacy changes
3. Verify privacy policy alignment with declarations
4. Update declarations if any discrepancies found
5. Document review in compliance records

---

## 6. Regional Considerations - Philippines

### Philippines-Specific Requirements

In addition to app store requirements, ensure:

1. **NPC Registration** - Register as Personal Information Controller with National Privacy Commission
2. **DPO Contact** - Data Protection Officer contact available in app
3. **Local Data Processing** - Disclose if data is processed outside Philippines
4. **Breach Notification** - 72-hour notification capability (see BREACH_NOTIFICATION.md)

### Privacy Policy Addendum for Philippines

Include a Philippines-specific section in your privacy policy:

```
PHILIPPINES DATA PRIVACY ACT COMPLIANCE
---------------------------------------
For users in the Philippines, your personal data is processed in
accordance with Republic Act No. 10173 (Data Privacy Act of 2012).

Your rights under the DPA include:
• Right to be informed
• Right to access your data
• Right to object to processing
• Right to erasure
• Right to data portability
• Right to file a complaint with the NPC

Data Protection Officer:
Email: dpo@lifeplace.com
Address: [Philippine business address]

National Privacy Commission:
Website: https://privacy.gov.ph
Hotline: (02) 8234-2228
```

---

## 7. Implementation Timeline

### Before App Store Submission

| Task | Owner | Status |
|------|-------|--------|
| Complete iOS Privacy Labels | Dev Team | Pending |
| Complete Google Data Safety | Dev Team | Pending |
| Create PrivacyInfo.xcprivacy | iOS Dev | Pending |
| Review third-party SDK disclosures | Dev Team | Pending |
| Update privacy policy | Legal | Pending |
| Implement data deletion endpoint | Backend | Pending |
| Implement data export endpoint | Backend | Pending |

### Post-Launch

| Task | Frequency |
|------|-----------|
| Review privacy declarations | Quarterly |
| SDK privacy audit | On SDK updates |
| Privacy policy review | Annually |
| NPC registration renewal | As required |

---

## Sources

- [App Privacy Details - Apple Developer](https://developer.apple.com/app-store/app-privacy-details/)
- [User Privacy and Data Use - Apple Developer](https://developer.apple.com/app-store/user-privacy-and-data-use/)
- [Privacy Labels - Apple](https://www.apple.com/privacy/labels/)
- [Google Play Data Safety Section](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Google Play Data Disclosure Requirements](https://developers.google.com/admob/android/privacy/play-data-disclosure)
- [Philippines National Privacy Commission](https://privacy.gov.ph/)
