import { useNavigate, useLocation } from "react-router";
import { PublicLayout } from "../components/layout";
import { Home } from "../pages/home";
import { GA4Events } from "../utils/ga4";

export function meta() {
  return [
    { title: "LifePlace Alfonso | Event Venue in Cavite" },
    {
      name: "description",
      content:
        "Book weddings, retreats, team building, and corporate events at LifePlace Alfonso. Beautiful nature venue in Cavite, Philippines.",
    },
    {
      property: "og:title",
      content: "LifePlace Alfonso | Event Venue in Cavite",
    },
    {
      property: "og:description",
      content:
        "Book weddings, retreats, team building, and corporate events at LifePlace Alfonso. Beautiful nature venue in Cavite, Philippines.",
    },
    { property: "og:image", content: "/og-image.jpg" },
    { property: "og:type", content: "website" },
  ];
}

export default function HomeRoute() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <PublicLayout fullHeight>
      <Home
        onNavigateToLogin={() => navigate("/login")}
        onNavigateToRegister={() => navigate("/register")}
        onNavigateToBooking={() => {
          GA4Events.ctaClicked("book_now", location.pathname);
          navigate("/booking");
        }}
      />
    </PublicLayout>
  );
}
