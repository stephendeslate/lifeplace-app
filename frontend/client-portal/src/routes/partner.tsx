import { PublicLayout } from "../components/layout";
import { PartnerPage } from "../pages/partner";

export function meta() {
  return [
    { title: "Partner With Us | LifePlace Alfonso" },
    {
      name: "description",
      content:
        "Partner with LifePlace Alfonso. Supplier and vendor partnership opportunities in Cavite.",
    },
    { property: "og:title", content: "Partner With Us | LifePlace Alfonso" },
    {
      property: "og:description",
      content:
        "Partner with LifePlace Alfonso. Supplier and vendor partnership opportunities in Cavite.",
    },
    { property: "og:image", content: "/og-image.jpg" },
    { property: "og:type", content: "website" },
  ];
}

export default function PartnerRoute() {
  return (
    <PublicLayout fullHeight>
      <PartnerPage />
    </PublicLayout>
  );
}
