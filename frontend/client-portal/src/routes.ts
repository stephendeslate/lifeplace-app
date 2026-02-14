// frontend/client-portal/src/routes.ts

import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  // Public routes — each has a meta() export for SEO
  index("routes/home.tsx"),
  route("about", "routes/about.tsx"),
  route("services", "routes/services.tsx"),
  route("rates", "routes/rates.tsx"),
  route("facilities", "routes/facilities.tsx"),
  route("gallery", "routes/gallery.tsx"),
  route("reviews", "routes/reviews.tsx"),
  route("contact", "routes/contact.tsx"),
  route("partner", "routes/partner.tsx"),
  route("podcasts", "routes/podcasts.tsx"),
  route("booking", "routes/booking.tsx"),
  route("booking/complete", "routes/booking-complete.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("terms", "routes/terms.tsx"),

  // Everything else (auth, protected routes) handled by existing App router
  route("*?", "catchall.tsx"),
] satisfies RouteConfig;
