/**
 * Cloudflare Worker for LifePlace Mobile App Deep Linking
 *
 * Serves Apple App Site Association (AASA) and Android assetlinks.json
 * for Universal Links (iOS) and App Links (Android).
 *
 * Deploy: wrangler deploy
 * Test: curl https://app.lifeplace.dev/.well-known/apple-app-site-association
 */

// =============================================================================
// CONFIGURATION - Update these values when you have them
// =============================================================================

const CONFIG = {
  // iOS Configuration
  ios: {
    // TODO: Replace with your Apple Developer Team ID (10 characters)
    // Found at: https://developer.apple.com/account -> Membership -> Team ID
    teamId: 'XXXXXXXXXX',

    // Bundle ID from app.json
    bundleId: 'com.lifeplace.app',
  },

  // Android Configuration
  android: {
    // Package name from app.json
    packageName: 'com.lifeplace.app',

    // TODO: Replace with your signing key SHA-256 fingerprints
    // Get with: eas credentials --platform android (after setting up signing)
    // Or: keytool -list -v -keystore your-keystore.jks -alias your-alias
    // Format: "XX:XX:XX:..." (64 hex characters with colons)
    sha256Fingerprints: [
      // Production signing key fingerprint
      'XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX',
      // Debug signing key fingerprint (optional, for testing)
      // 'YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY:YY',
    ],
  },

  // Deep link paths that the app handles
  // These must match the paths in app.json intentFilters
  paths: [
    '/actions/*',
    '/quotes/*',
    '/contracts/*',
    '/payments/*',
    '/events/*',
  ],
};

// =============================================================================
// Apple App Site Association (iOS Universal Links)
// =============================================================================

function getAppleAppSiteAssociation() {
  return {
    applinks: {
      apps: [], // Must be empty array
      details: [
        {
          appID: `${CONFIG.ios.teamId}.${CONFIG.ios.bundleId}`,
          paths: CONFIG.paths,
        },
      ],
    },
    webcredentials: {
      apps: [`${CONFIG.ios.teamId}.${CONFIG.ios.bundleId}`],
    },
  };
}

// =============================================================================
// Android Asset Links (Android App Links)
// =============================================================================

function getAndroidAssetLinks() {
  return CONFIG.android.sha256Fingerprints
    .filter(fp => !fp.startsWith('XX:')) // Filter out placeholder fingerprints
    .map(fingerprint => ({
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: CONFIG.android.packageName,
        sha256_cert_fingerprints: [fingerprint],
      },
    }));
}

// =============================================================================
// Request Handler
// =============================================================================

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for verification requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Apple App Site Association
    if (path === '/.well-known/apple-app-site-association' || path === '/apple-app-site-association') {
      const aasa = getAppleAppSiteAssociation();
      return new Response(JSON.stringify(aasa, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          ...corsHeaders,
        },
      });
    }

    // Android Asset Links
    if (path === '/.well-known/assetlinks.json') {
      const assetLinks = getAndroidAssetLinks();
      return new Response(JSON.stringify(assetLinks, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
          ...corsHeaders,
        },
      });
    }

    // Health check
    if (path === '/health' || path === '/') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'lifeplace-app-links',
        timestamp: new Date().toISOString(),
        configured: {
          ios: CONFIG.ios.teamId !== 'XXXXXXXXXX',
          android: !CONFIG.android.sha256Fingerprints[0].startsWith('XX:'),
        },
      }, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // Redirect unknown paths to main site
    return Response.redirect('https://lifeplace.dev', 302);
  },
};
