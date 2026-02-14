// frontend/client-portal/src/catchall.tsx
//
// Renders the existing App router for all routes not yet migrated
// to framework mode route modules.

import { AppRouter } from "./App";

export default function Catchall() {
  return <AppRouter />;
}
