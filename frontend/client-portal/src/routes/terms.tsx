import { PublicLayout } from "../components/layout";
import { TermsPage } from "../pages/legal";

export function meta() {
  return [
    { title: "Terms of Service | LifePlace Alfonso" },
    {
      name: "description",
      content: "Terms of service for LifePlace Alfonso event bookings.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export default function TermsRoute() {
  return (
    <PublicLayout>
      <TermsPage />
    </PublicLayout>
  );
}
