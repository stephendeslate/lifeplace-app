import { PublicLayout } from "../components/layout";
import { PrivacyPage } from "../pages/legal";

export function meta() {
  return [
    { title: "Privacy Policy | LifePlace Alfonso" },
    {
      name: "description",
      content: "Privacy policy for LifePlace Alfonso.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export default function PrivacyRoute() {
  return (
    <PublicLayout>
      <PrivacyPage />
    </PublicLayout>
  );
}
