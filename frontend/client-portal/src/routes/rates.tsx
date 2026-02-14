import { useNavigate, useLocation } from "react-router";
import { PublicLayout } from "../components/layout";
import { RatesPage } from "../pages/rates";
import { GA4Events } from "../utils/ga4";

export function meta() {
  return [
    { title: "Rates & Packages | LifePlace Alfonso" },
    {
      name: "description",
      content:
        "View our rates and packages for events, retreats, and weddings at LifePlace Alfonso.",
    },
    { property: "og:title", content: "Rates & Packages | LifePlace Alfonso" },
    {
      property: "og:description",
      content:
        "View our rates and packages for events, retreats, and weddings at LifePlace Alfonso.",
    },
    { property: "og:image", content: "/og-image.jpg" },
    { property: "og:type", content: "website" },
  ];
}

export default function RatesRoute() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <PublicLayout fullHeight>
      <RatesPage
        onNavigateToBooking={() => {
          GA4Events.ctaClicked("book_now", location.pathname);
          navigate("/booking");
        }}
      />
    </PublicLayout>
  );
}
