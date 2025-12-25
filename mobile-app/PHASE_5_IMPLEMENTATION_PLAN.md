# Phase 5: Action Center & Financial Portal - Implementation Plan

> **Status:** READY FOR IMPLEMENTATION
> **Target:** Full feature parity with client-portal
> **Prerequisite:** Phases 1-4 must be complete
> **Last Updated:** December 24, 2024

---

## Executive Summary

Phase 5 implements three major feature areas:
1. **Action Center** - Unified view of all pending client actions
2. **Financial Portal** - Complete payment and invoice management
3. **Quote & Contract Management** - Dedicated screens with accept/reject/sign capabilities

---

## Current State Analysis

### Already Implemented in Mobile App

| Layer | File | Status | Notes |
|-------|------|--------|-------|
| **APIs** | `src/apis/quotes.api.ts` | Partial | Basic CRUD, accept/reject - Missing PDF download utility methods |
| | `src/apis/contracts.api.ts` | Partial | Basic CRUD, sign - Missing signature metadata, device fingerprint |
| | `src/apis/payments.api.ts` | Partial | Basic CRUD, payment intent - Missing payment methods management, setup intent |
| **Hooks** | `src/hooks/useQuotes.ts` | Complete | All query/mutation hooks present |
| | `src/hooks/useContracts.ts` | Complete | All query/mutation hooks present |
| | `src/hooks/useFinancial.ts` | Complete | All query/mutation hooks present |
| **Types** | `src/types/dashboard.types.ts` | Partial | Has PendingQuote, PendingContract, FinancialSummary |
| | `src/types/events.types.ts` | Complete | Has ContractStatus, SignatureProgress |
| **Screens** | `app/actions/index.tsx` | NOT CREATED | |
| | `app/quotes/[id].tsx` | NOT CREATED | |
| | `app/contracts/[id].tsx` | NOT CREATED | |
| | `app/payments/index.tsx` | NOT CREATED | |
| | `app/payments/[id].tsx` | NOT CREATED | |

### Client Portal Reference Files

| Feature | Reference File |
|---------|---------------|
| Action Center Types | `frontend/client-portal/src/types/action-center.types.ts` |
| Action Center Hook | `frontend/client-portal/src/hooks/useActionCenter.ts` |
| Quote Types | `frontend/client-portal/src/types/quotes.types.ts` |
| Contract Types | `frontend/client-portal/src/types/contracts.types.ts` |
| Financial Types | `frontend/client-portal/src/types/financial.types.ts` |
| Contract Signing | `frontend/client-portal/src/components/contracts/ContractSigningDialog.tsx` |
| Signature Pad | `frontend/client-portal/src/components/contracts/EnhancedSignaturePad.tsx` |

---

## Implementation Tasks

### 5.1 Action Center Screen

**Reference:** [DEVELOPMENT_GUIDE.md lines 3919-4185](DEVELOPMENT_GUIDE.md#action-center-screen)

#### 5.1.1 Types (Priority: HIGH)

Create `src/types/action-center.types.ts`:

```typescript
// Types to implement (matching client-portal):
- ActionType = 'TASK' | 'QUOTE' | 'CONTRACT' | 'PAYMENT'
- UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
- ActionItem (base interface)
- TaskActionItem, QuoteActionItem, ContractActionItem, PaymentActionItem
- AnyActionItem (union type)
- ActionCenterFilters
- ActionCounts
- Type guards: isTaskAction, isQuoteAction, isContractAction, isPaymentAction
- Helper functions: calculateUrgencyFromDays, calculateUrgencyFromPriority
- UI configs: ACTION_TYPE_CONFIGS, URGENCY_CONFIGS (with phosphor icons instead of MUI)
```

**Files to create:**
- [ ] `src/types/action-center.types.ts`

#### 5.1.2 useActionCenter Hook (Priority: HIGH)

Create `src/hooks/useActionCenter.ts`:

**Implementation approach:**
1. Import existing hooks: `usePendingQuotes`, `usePendingContracts`, `useOverduePayments`
2. Fetch events with tasks from `useDashboard` or `useEvents`
3. Transform each data type to `AnyActionItem` format
4. Aggregate, filter, sort, and return with counts

**Key functions to implement:**
- `transformTaskToAction(task, eventId, eventName)` → TaskActionItem
- `transformQuoteToAction(quote)` → QuoteActionItem
- `transformContractToAction(contract)` → ContractActionItem
- `transformInvoiceToAction(invoice)` → PaymentActionItem
- `sortActions(actions, sortBy, direction)` → sorted array
- `useActionCenter(options)` → main hook with filters/sorting
- `useActionCount()` → lightweight hook for badge

**Files to create:**
- [ ] `src/hooks/useActionCenter.ts`

#### 5.1.3 Components (Priority: HIGH)

**ActionItemCard.tsx:**
- Display urgency indicator (colored left border or badge)
- Show action type icon (phosphor-react-native)
- Title, description, event name
- Due date / days remaining
- Tap navigates to respective detail screen

**FilterModal.tsx:**
- Bottom sheet modal (or full screen on mobile)
- Type filters (multi-select chips)
- Urgency filters
- Event filter (dropdown)
- Clear all / Apply buttons

**Files to create:**
- [ ] `src/components/actions/ActionItemCard.tsx`
- [ ] `src/components/actions/index.ts`
- [ ] `src/components/common/FilterModal.tsx`

#### 5.1.4 Action Center Screen (Priority: HIGH)

Create `app/actions/index.tsx`:

**Features:**
- Header with title and summary counts (Critical, High)
- Search bar with magnifying glass
- Filter button opening FilterModal
- Horizontal type filter chips (All, Quotes, Contracts, Payments, Tasks)
- FlatList of ActionItemCard components
- Empty state when all caught up
- Pull-to-refresh
- Navigation to respective detail screens on tap

**Files to create:**
- [ ] `app/actions/index.tsx`
- [ ] `app/actions/_layout.tsx` (if needed for stack)

---

### 5.2 Quote Management

#### 5.2.1 Quote Detail Screen (Priority: HIGH)

Create `app/quotes/[id].tsx`:

**Features:**
- Quote header with status badge and amount
- Event info (name, date)
- Line items list with quantities and prices
- Subtotal, tax, discount, total breakdown
- Terms & conditions (expandable)
- Notes section
- Expiry date with countdown
- Accept/Reject action buttons (for SENT status)
- Rejection reason input (modal or inline)

**UI States:**
- Loading skeleton
- Error state
- Expired quote state (show message, no actions)
- Accepted/Rejected state (show confirmation)

**Files to create:**
- [ ] `app/quotes/[id].tsx`
- [ ] `app/quotes/_layout.tsx`
- [ ] `src/components/quotes/QuoteLineItem.tsx`
- [ ] `src/components/quotes/QuoteStatusBadge.tsx`
- [ ] `src/components/quotes/QuoteActionButtons.tsx`
- [ ] `src/components/quotes/RejectQuoteModal.tsx`
- [ ] `src/components/quotes/index.ts`

#### 5.2.2 API Enhancements (Priority: MEDIUM)

Update `src/apis/quotes.api.ts`:

**Add static utility methods (matching client-portal):**
- `formatAmount(amount, currency)` - Currency formatting
- `getCurrencySymbol(currency)` - Symbol extraction
- `getStatusColor(status)` - Color mapping for UI
- `getQuoteDisplayStatus(status)` - Human-readable status
- `isQuoteActionable(quote)` - Can accept/reject
- `isQuoteExpiringSoon(quote)` - Alert within 3 days

**Files to update:**
- [ ] `src/apis/quotes.api.ts`

---

### 5.3 Financial Portal Screen

**Reference:** [DEVELOPMENT_GUIDE.md lines 4486-4762](DEVELOPMENT_GUIDE.md#financial-portal-screen)

#### 5.3.1 Main Financial Portal (Priority: HIGH)

Create `app/payments/index.tsx`:

**Features:**
- Header with "Payments" title
- Overview cards (horizontal scroll):
  - Total Paid (green)
  - Pending Amount (amber/lavender)
  - Overdue Amount (red) - only if overdue > 0
- Tab switcher: Invoices | History | Methods
- **Invoices Tab:**
  - List of InvoiceCard components
  - Filter by status (optional)
  - Tap navigates to invoice detail
- **History Tab:**
  - List of completed payments
  - Payment method icon, amount, date
- **Methods Tab:**
  - List of PaymentMethodCard components
  - Add Payment Method button (dashed border)
- Pull-to-refresh

**Files to create:**
- [ ] `app/payments/index.tsx`
- [ ] `app/payments/_layout.tsx`

#### 5.3.2 Invoice Detail Screen (Priority: HIGH)

Create `app/payments/[id].tsx`:

**Features:**
- Invoice header with number and status badge
- Event info
- Line items breakdown (description, qty, unit price, total)
- Tax breakdown
- Payment progress (if partially paid)
- Due date with urgency indicator
- Pay Now button (for unpaid/partial)
- Download PDF button
- Payment history for this invoice

**Files to create:**
- [ ] `app/payments/[id].tsx`

#### 5.3.3 Financial Components (Priority: HIGH)

**InvoiceCard.tsx:**
- Invoice number, event name
- Status badge (color-coded)
- Amount due
- Due date
- Progress bar (if partially paid)
- Tap to navigate

**PaymentMethodCard.tsx:**
- Card type icon (credit card, bank, etc.)
- Last 4 digits / account hint
- Expiry date (if card)
- Default badge
- Edit/Delete actions

**Files to create:**
- [ ] `src/components/payments/InvoiceCard.tsx`
- [ ] `src/components/payments/PaymentMethodCard.tsx`
- [ ] `src/components/payments/InvoiceStatusBadge.tsx`
- [ ] `src/components/payments/PaymentProgress.tsx`
- [ ] `src/components/payments/index.ts`

#### 5.3.4 Add Payment Method (Priority: MEDIUM)

Create `app/payments/add-method.tsx`:

**Features:**
- Integration with Stripe React Native SDK
- Card input form (or Stripe Elements equivalent)
- Save for future use toggle
- Set as default option

**Dependencies:**
- `@stripe/stripe-react-native` (install if not already)

**Files to create:**
- [ ] `app/payments/add-method.tsx`

#### 5.3.5 API Enhancements (Priority: MEDIUM)

Update `src/apis/payments.api.ts`:

**Add missing endpoints:**
- `getPaymentMethods()` - List saved payment methods
- `createPaymentMethod(data)` - Save new method
- `updatePaymentMethod(id, data)` - Update existing
- `deletePaymentMethod(id)` - Remove method
- `setDefaultPaymentMethod(id)` - Mark as default
- `createStripeSetupIntent()` - For saving cards

**Add utility methods:**
- `getPaymentMethodIcon(type)` - Icon name for type
- `getInvoiceStatusColor(status)` - Color mapping
- `calculatePaymentProgress(invoice)` - Percentage paid

**Files to update:**
- [ ] `src/apis/payments.api.ts`

#### 5.3.6 Hook Enhancements (Priority: MEDIUM)

Update `src/hooks/useFinancial.ts`:

**Add missing hooks:**
- `usePaymentMethods()` - List payment methods
- `useAddPaymentMethod()` - Mutation
- `useUpdatePaymentMethod()` - Mutation
- `useDeletePaymentMethod()` - Mutation
- `useSetDefaultPaymentMethod()` - Mutation
- `useCreateSetupIntent()` - For Stripe

**Files to update:**
- [ ] `src/hooks/useFinancial.ts`

---

### 5.4 Contract Management

#### 5.4.1 Contract Detail Screen (Priority: HIGH)

Create `app/contracts/[id].tsx`:

**Features:**
- Contract header with template name and status
- Event info
- Signature progress indicator (X of Y signed)
- Contract content viewer (HTML/WebView or formatted text)
- Signature list (who signed, who pending)
- Expiry date with countdown
- Sign Contract button (if can_client_sign)
- Download PDF button

**Files to create:**
- [ ] `app/contracts/[id].tsx`
- [ ] `app/contracts/_layout.tsx`

#### 5.4.2 Digital Signature Capture (Priority: HIGH)

**Signing Flow (Multi-step):**
1. **Review Contract** - Display contract content
2. **Legal Disclosure** - Accept e-signature terms checkbox
3. **Signature Capture** - Canvas-based signature pad
4. **Confirmation** - Review captured signature
5. **Complete** - Success message

**SignaturePad Component:**
- Canvas for drawing signature
- Clear button
- Undo (optional)
- Color selection (optional)
- Capture signature as base64 PNG
- Validate signature has content (not empty)

**Required Package:**
```bash
npm install react-native-signature-canvas
# OR
npx expo install react-native-webview  # for web-based signature pad
```

**Signature Submission Data:**
```typescript
interface SignatureSubmission {
  signature_data: string;           // Base64 encoded PNG
  signer_name: string;
  signer_email: string;
  agreed_to_terms: boolean;         // Legal disclosure accepted
  device_fingerprint?: string;      // For audit
  signature_timestamp?: string;     // ISO timestamp
}
```

**Files to create:**
- [ ] `src/components/contracts/ContractSigningFlow.tsx` (full-screen modal/stack)
- [ ] `src/components/contracts/SignaturePad.tsx`
- [ ] `src/components/contracts/LegalDisclosure.tsx`
- [ ] `src/components/contracts/SignatureConfirmation.tsx`
- [ ] `src/components/contracts/ContractViewer.tsx` (WebView or text)
- [ ] `src/components/contracts/SignatureProgress.tsx`
- [ ] `src/components/contracts/ContractStatusBadge.tsx`
- [ ] `src/components/contracts/index.ts`

#### 5.4.3 API Enhancements (Priority: MEDIUM)

Update `src/apis/contracts.api.ts`:

**Enhance sign contract to include metadata:**
```typescript
signContract(id, data: {
  signature_data: string;
  signer_name: string;
  signer_email?: string;
  agreed_to_terms: boolean;
  device_fingerprint?: string;
  signature_timestamp?: string;
})
```

**Add utility methods:**
- `generateDeviceFingerprint()` - Create device hash
- `validateSignature(base64)` - Check signature has content
- `createSignatureMetadata()` - Timestamp, screen res, etc.
- `getContractStatusColor(status)` - Color mapping

**Files to update:**
- [ ] `src/apis/contracts.api.ts`

#### 5.4.4 Utility Files (Priority: MEDIUM)

Create `src/utils/signature.ts`:

```typescript
// Functions to implement:
- generateDeviceFingerprint(): string
- validateSignatureData(base64: string): boolean
- createSignatureMetadata(): SignatureMetadata
- getMinimumSignatureComplexity(): number
```

**Files to create:**
- [ ] `src/utils/signature.ts`

---

### 5.5 File Download Integration

#### 5.5.1 Document Download Hook (Priority: MEDIUM)

**Required packages:**
```bash
npx expo install expo-file-system expo-sharing
```

Create `src/hooks/useDocumentDownload.ts`:

```typescript
// Hook for downloading and sharing PDFs
- Download blob from API
- Save to local file system
- Open share sheet OR open in PDF viewer
- Handle download progress
- Error handling
```

**Files to create:**
- [ ] `src/hooks/useDocumentDownload.ts`

---

## Dependency Installation

```bash
# Required new packages for Phase 5
npx expo install react-native-webview           # Contract content viewer (HTML)
npm install react-native-signature-canvas       # Signature capture
npx expo install expo-file-system               # PDF download
npx expo install expo-sharing                   # PDF share sheet
npx expo install @stripe/stripe-react-native   # Stripe payments & saved cards
npx expo install expo-linking                   # Deep linking support

# Optional: GCash integration (depends on their SDK availability)
# May require custom native module or WebView-based integration
```

### GCash Integration Notes

GCash integration options for React Native:
1. **GCash API (Server-side)** - Backend creates payment intent, mobile shows GCash payment via WebView redirect
2. **GCash SDK** - If official React Native SDK available
3. **Generic redirect** - Open GCash app via deep link or universal link

**Recommended approach:** Server-side API integration with WebView checkout flow, similar to Stripe's redirect-based 3D Secure flow.

---

## Navigation Structure

```
app/
├── actions/
│   ├── _layout.tsx
│   └── index.tsx          # Action Center
├── quotes/
│   ├── _layout.tsx
│   └── [id].tsx           # Quote Detail
├── contracts/
│   ├── _layout.tsx
│   └── [id].tsx           # Contract Detail (includes signing flow)
├── payments/
│   ├── _layout.tsx
│   ├── index.tsx          # Financial Portal
│   ├── [id].tsx           # Invoice Detail
│   └── add-method.tsx     # Add Payment Method
```

## Deep Linking Configuration

### app.json Configuration
```json
{
  "expo": {
    "scheme": "lifeplace",
    "ios": {
      "associatedDomains": ["applinks:yourdomain.com"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            { "scheme": "lifeplace" },
            { "scheme": "https", "host": "yourdomain.com", "pathPrefix": "/app" }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### Supported Deep Links
| Route | URL Pattern | Usage |
|-------|-------------|-------|
| Action Center | `lifeplace://actions` | Open action center |
| Quote Detail | `lifeplace://quotes/{id}` | View specific quote |
| Contract Detail | `lifeplace://contracts/{id}` | View/sign contract |
| Invoice Detail | `lifeplace://payments/{id}` | View/pay invoice |
| Financial Portal | `lifeplace://payments` | Open financial portal |

### Expo Router Deep Link Handling
With expo-router, these routes are automatically handled when the URL scheme matches. Create a `app/+not-found.tsx` for unmatched routes.

---

## Component Directory Structure

```
src/
├── types/
│   └── action-center.types.ts     # NEW
├── hooks/
│   ├── useActionCenter.ts         # NEW
│   └── useDocumentDownload.ts     # NEW
├── utils/
│   └── signature.ts               # NEW
├── components/
│   ├── actions/
│   │   ├── ActionItemCard.tsx     # NEW
│   │   └── index.ts               # NEW
│   ├── quotes/
│   │   ├── QuoteLineItem.tsx      # NEW
│   │   ├── QuoteStatusBadge.tsx   # NEW
│   │   ├── QuoteActionButtons.tsx # NEW
│   │   ├── RejectQuoteModal.tsx   # NEW
│   │   └── index.ts               # NEW
│   ├── contracts/
│   │   ├── ContractSigningFlow.tsx # NEW
│   │   ├── SignaturePad.tsx       # NEW
│   │   ├── LegalDisclosure.tsx    # NEW
│   │   ├── ContractViewer.tsx     # NEW
│   │   ├── SignatureProgress.tsx  # NEW
│   │   ├── ContractStatusBadge.tsx # NEW
│   │   └── index.ts               # NEW
│   ├── payments/
│   │   ├── InvoiceCard.tsx        # NEW
│   │   ├── PaymentMethodCard.tsx  # NEW
│   │   ├── InvoiceStatusBadge.tsx # NEW
│   │   ├── PaymentProgress.tsx    # NEW
│   │   └── index.ts               # NEW
│   └── common/
│       └── FilterModal.tsx        # NEW
```

---

## Implementation Order (Recommended)

### Week 1: Core Infrastructure
1. [ ] Install dependencies (expo-file-system, expo-sharing, react-native-webview, react-native-signature-canvas)
2. [ ] Create `src/types/action-center.types.ts`
3. [ ] Create `src/hooks/useActionCenter.ts`
4. [ ] Create `src/utils/signature.ts`

### Week 2: Action Center
5. [ ] Create `src/components/common/FilterModal.tsx`
6. [ ] Create `src/components/actions/ActionItemCard.tsx`
7. [ ] Create `app/actions/index.tsx`
8. [ ] Test Action Center with mock data and real API

### Week 3: Quote Management
9. [ ] Create quote components (QuoteLineItem, QuoteStatusBadge, QuoteActionButtons, RejectQuoteModal)
10. [ ] Create `app/quotes/[id].tsx`
11. [ ] Test quote accept/reject flow

### Week 4: Financial Portal
12. [ ] Create payment components (InvoiceCard, PaymentMethodCard, etc.)
13. [ ] Create `app/payments/index.tsx`
14. [ ] Create `app/payments/[id].tsx`
15. [ ] Integrate payment methods management

### Week 5: Contract Management
16. [ ] Create contract components (ContractViewer, SignatureProgress, etc.)
17. [ ] Create SignaturePad component
18. [ ] Create ContractSigningFlow
19. [ ] Create `app/contracts/[id].tsx`
20. [ ] Test full signing flow

### Week 6: Polish & Integration
21. [ ] Create `src/hooks/useDocumentDownload.ts`
22. [ ] Add PDF download to quotes, contracts, invoices
23. [ ] Navigation integration from dashboard/events
24. [ ] Error handling and edge cases
25. [ ] Performance optimization

---

## Technical Decisions (CONFIRMED)

### 1. Signature Pad Library
**Decision:** `react-native-signature-canvas`
- Popular canvas-based library
- Works with Expo managed workflow
- Good documentation and community support

### 2. Contract Content Display
**Decision:** WebView with HTML content
- Backend stores contract content as HTML
- Use `react-native-webview` to render
- Supports rich formatting (bold, lists, tables, etc.)

### 3. Payment Gateways
**Decision:** Multiple gateway support
- **Stripe** - Credit/debit card payments with saved methods
- **GCash** - Philippines e-wallet integration
- Gateway selector UI needed in payment flow

### 4. PDF Download Behavior
**Decision:** Share sheet approach
- Download PDF blob from API
- Save to temporary file using `expo-file-system`
- Open native share sheet using `expo-sharing`
- User can save, share, or open in preferred app

### 5. Deep Linking
**Decision:** YES - Support deep linking
- Enable navigation from push notifications
- URL scheme: `lifeplace://quotes/123`, `lifeplace://contracts/456`, etc.
- Configure in `app.json` and expo-router

---

## Testing Checklist

### Action Center
- [ ] Actions load from all sources (tasks, quotes, contracts, payments)
- [ ] Urgency calculations are correct
- [ ] Filters work (type, urgency, event, search)
- [ ] Sorting works (urgency, due date, type, event)
- [ ] Empty state displays when all caught up
- [ ] Pull-to-refresh reloads data
- [ ] Tapping action navigates to correct screen

### Quotes
- [ ] Quote detail loads correctly
- [ ] Line items display with proper calculations
- [ ] Accept quote works (triggers invoice/contract creation)
- [ ] Reject quote works with reason
- [ ] Expired quotes show appropriate state
- [ ] PDF download works

### Financial Portal
- [ ] Overview cards show correct amounts
- [ ] Tab switching works
- [ ] Invoices list loads
- [ ] Invoice detail shows line items
- [ ] Payment history displays
- [ ] Payment methods list loads
- [ ] Add payment method works with Stripe

### Contracts
- [ ] Contract detail loads
- [ ] Contract content displays correctly
- [ ] Signature progress shows
- [ ] Signing flow opens
- [ ] Legal disclosure works
- [ ] Signature pad captures signature
- [ ] Signature submission works
- [ ] PDF download works

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Signature pad library issues | HIGH | MEDIUM | Evaluate multiple options before committing |
| Contract HTML rendering issues | MEDIUM | MEDIUM | Test with various contract templates |
| Stripe integration complexity | HIGH | LOW | Follow Expo Stripe documentation |
| Backend API changes | MEDIUM | LOW | Confirm API specs before implementation |
| Performance with many actions | MEDIUM | LOW | Use virtualized lists, pagination |

---

## Success Criteria

1. **Action Center:** User can see all pending actions in one place, filter, and navigate
2. **Quotes:** User can view, accept, or reject quotes
3. **Financial Portal:** User can view invoices, payment history, and manage payment methods
4. **Contracts:** User can view contracts and complete digital signature
5. **All screens:** Match client-portal functionality and visual design

---

*Document created: Phase 5 Implementation Plan*
*Last updated: [Current Date]*
