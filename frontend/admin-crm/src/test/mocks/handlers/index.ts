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
import { vipHandlers } from "./vip.handlers";
import { galleryHandlers } from "./gallery.handlers";
import { layoutsHandlers } from "./layouts.handlers";
import { metricsHandlers } from "./metrics.handlers";
import { tasksHandlers } from "./tasks.handlers";
import { availabilityHandlers } from "./availability.handlers";
import { currencyHandlers } from "./currency.handlers";
import { bookingFlowsHandlers } from "./bookingflows.handlers";
import { workflowsHandlers } from "./workflows.handlers";
import { questionnairesHandlers } from "./questionnaires.handlers";
import { settingsHandlers } from "./settings.handlers";
import { supportHandlers } from "./support.handlers";
import { salesHandlers } from "./sales.handlers";
import { vendorsHandlers } from "./vendors.handlers";

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
  ...vipHandlers,
  ...galleryHandlers,
  ...layoutsHandlers,
  ...metricsHandlers,
  ...tasksHandlers,
  ...availabilityHandlers,
  ...currencyHandlers,
  ...bookingFlowsHandlers,
  ...workflowsHandlers,
  ...questionnairesHandlers,
  ...settingsHandlers,
  ...supportHandlers,
  ...salesHandlers,
  ...vendorsHandlers,
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
export { resetVIPStore } from "./vip.handlers";
export { resetGalleryStore } from "./gallery.handlers";
export { resetLayoutsStore } from "./layouts.handlers";
export { resetMetricsStore } from "./metrics.handlers";
export { resetTasksStore } from "./tasks.handlers";
export { resetAvailabilityStore } from "./availability.handlers";
export { resetCurrencyStore } from "./currency.handlers";
export { resetBookingFlowsStore } from "./bookingflows.handlers";
export { resetWorkflowsStore } from "./workflows.handlers";
export { resetQuestionnairesStore } from "./questionnaires.handlers";
export { resetSettingsStore } from "./settings.handlers";
export { resetSupportStore } from "./support.handlers";
export { resetSalesStore } from "./sales.handlers";
export { resetVendorsStore } from "./vendors.handlers";
