// frontend/client-portal/src/utils/ga4.ts
/**
 * Google Analytics 4 integration utility.
 * Only fires in production when measurement ID is present and user has consented.
 */

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as
  | string
  | undefined;

let isInitialized = false;

/**
 * Initialize GA4 by injecting the gtag.js script.
 * Only runs in production with a valid measurement ID.
 */
export function initGA4(): void {
  if (isInitialized) return;
  if (!import.meta.env.PROD) return;
  if (!GA_MEASUREMENT_ID) return;

  // Inject gtag.js script
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag function
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: false, // We handle page views manually for SPA
  });

  isInitialized = true;
}

/**
 * Track a custom GA4 event.
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (!isInitialized || !window.gtag) return;
  window.gtag("event", eventName, params);
}

/**
 * Track a page view (for SPA navigation).
 */
export function trackPageView(path: string, title?: string): void {
  if (!isInitialized || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title || document.title,
  });
}

/**
 * Pre-defined GA4 event helpers for common user actions.
 */
export const GA4Events = {
  // Booking funnel
  bookingStarted: (eventType?: string) =>
    trackEvent("booking_started", { event_type: eventType }),

  bookingStepViewed: (stepType: string, stepIndex: number) =>
    trackEvent("booking_step_viewed", {
      step_type: stepType,
      step_index: stepIndex,
    }),

  bookingStepCompleted: (stepType: string, stepIndex: number) =>
    trackEvent("booking_step_completed", {
      step_type: stepType,
      step_index: stepIndex,
    }),

  bookingCompleted: (eventType?: string, totalPrice?: number) =>
    trackEvent("purchase", {
      event_type: eventType,
      value: totalPrice,
      currency: "PHP",
    }),

  bookingAbandoned: (stepType: string, stepIndex: number) =>
    trackEvent("booking_abandoned", {
      step_type: stepType,
      step_index: stepIndex,
    }),

  // Payments
  paymentInitiated: (gateway: string, amount?: number) =>
    trackEvent("begin_checkout", {
      payment_method: gateway,
      value: amount,
      currency: "PHP",
    }),

  paymentCompleted: (gateway: string, amount?: number) =>
    trackEvent("purchase", {
      payment_method: gateway,
      value: amount,
      currency: "PHP",
    }),

  // Engagement
  ctaClicked: (ctaName: string, pageLocation: string) =>
    trackEvent("cta_clicked", {
      cta_name: ctaName,
      page_location: pageLocation,
    }),

  contactFormSubmitted: () =>
    trackEvent("generate_lead", { method: "contact_form" }),

  // Auth
  loginCompleted: (method: string) => trackEvent("login", { method }),

  registrationCompleted: (method: string) => trackEvent("sign_up", { method }),

  // Gallery
  galleryViewed: (category?: string) =>
    trackEvent("gallery_view", { category }),

  galleryPhotoClicked: (params: {
    category?: string;
    venue_name?: string;
    source?: string;
  }) => trackEvent("gallery_photo_click", params),

  galleryCtaClicked: (ctaType: string, venueName?: string) =>
    trackEvent("gallery_cta_click", {
      cta_type: ctaType,
      venue_name: venueName,
    }),

  galleryFilterChanged: (fromCategory: string, toCategory: string) =>
    trackEvent("gallery_filter_change", {
      from_category: fromCategory,
      to_category: toCategory,
    }),
};
