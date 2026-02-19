// frontend/admin-crm/src/test/mocks/handlers/index.ts

import { authHandlers } from "./auth.handlers";
import { clientHandlers } from "./clients.handlers";
import { eventsHandlers } from "./events.handlers";
import { productsHandlers } from "./products.handlers";
import { venuesHandlers } from "./venues.handlers";
import { notesHandlers } from "./notes.handlers";
import { analyticsHandlers } from "./analytics.handlers";
import { notificationsHandlers } from "./notifications.handlers";
import { communicationsHandlers } from "./communications.handlers";
import { contractsHandlers } from "./contracts.handlers";
import { paymentsHandlers } from "./payments.handlers";

export const handlers = [
  ...authHandlers,
  ...clientHandlers,
  ...eventsHandlers,
  ...productsHandlers,
  ...venuesHandlers,
  ...notesHandlers,
  ...analyticsHandlers,
  ...notificationsHandlers,
  ...communicationsHandlers,
  ...contractsHandlers,
  ...paymentsHandlers,
];

export { resetClientsStore } from "./clients.handlers";
export { resetEventsStore } from "./events.handlers";
export { resetProductsStore } from "./products.handlers";
export { resetVenuesStore } from "./venues.handlers";
export { resetNotesStore } from "./notes.handlers";
export { resetAnalyticsStore } from "./analytics.handlers";
export { resetNotificationsStore } from "./notifications.handlers";
export { resetCommunicationsStore } from "./communications.handlers";
export { resetContractsStore } from "./contracts.handlers";
export { resetPaymentsStore } from "./payments.handlers";
