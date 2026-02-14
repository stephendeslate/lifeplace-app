import { BookingLayout } from "../components/layout";
import { BookingComplete } from "../pages/booking";

export function meta() {
  return [
    { title: "Booking Complete | LifePlace Alfonso" },
    {
      name: "description",
      content: "Your booking at LifePlace Alfonso has been confirmed.",
    },
    { property: "og:title", content: "Booking Complete | LifePlace Alfonso" },
    {
      property: "og:description",
      content: "Your booking at LifePlace Alfonso has been confirmed.",
    },
    { property: "og:image", content: "/og-image.jpg" },
    { property: "og:type", content: "website" },
  ];
}

export default function BookingCompleteRoute() {
  return (
    <BookingLayout>
      <BookingComplete />
    </BookingLayout>
  );
}
