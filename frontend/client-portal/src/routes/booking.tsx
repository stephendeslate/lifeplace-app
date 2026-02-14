import { BookingLayout } from "../components/layout";
import { BookingPage } from "../pages/booking";

export function meta() {
  return [
    { title: "Book Your Event | LifePlace Alfonso" },
    {
      name: "description",
      content:
        "Book your event at LifePlace Alfonso. Easy online booking for retreats, weddings, and corporate events.",
    },
    { property: "og:title", content: "Book Your Event | LifePlace Alfonso" },
    {
      property: "og:description",
      content:
        "Book your event at LifePlace Alfonso. Easy online booking for retreats, weddings, and corporate events.",
    },
    { property: "og:image", content: "/og-image.jpg" },
    { property: "og:type", content: "website" },
  ];
}

export default function BookingRoute() {
  return (
    <BookingLayout>
      <BookingPage />
    </BookingLayout>
  );
}
