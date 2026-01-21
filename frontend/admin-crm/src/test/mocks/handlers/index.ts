// frontend/admin-crm/src/test/mocks/handlers/index.ts

import { authHandlers } from './auth.handlers'
import { clientHandlers } from './clients.handlers'
import { eventsHandlers } from './events.handlers'
import { productsHandlers } from './products.handlers'
import { venuesHandlers } from './venues.handlers'

export const handlers = [
  ...authHandlers,
  ...clientHandlers,
  ...eventsHandlers,
  ...productsHandlers,
  ...venuesHandlers,
]

export { resetClientsStore } from './clients.handlers'
export { resetEventsStore } from './events.handlers'
export { resetProductsStore } from './products.handlers'
export { resetVenuesStore } from './venues.handlers'
