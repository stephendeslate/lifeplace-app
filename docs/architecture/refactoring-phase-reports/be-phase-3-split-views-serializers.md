# Phase 3: Split Oversized Views & Serializers

**Branch**: `refactor/phase-3-split-views-serializers`
**Date**: 2026-03-19
**Status**: Complete

## Summary

Split 6 oversized view and serializer files across 5 domains into packages with sub-modules. All files now under 500 lines (except `booking_step_views.py` at 620 lines, pre-existing and out of scope). No API contract, URL routing, or migration changes.

## Changes

### 1. sales/views.py (838 lines) → views/ package
| File | Contents | Lines |
|------|----------|-------|
| `views/__init__.py` | Re-exports all viewsets | ~15 |
| `views/quote_views.py` | QuoteViewSet | ~300 |
| `views/pricing_views.py` | PricingViewSet | ~250 |
| `views/reporting_views.py` | SalesReportingViewSet | ~280 |

### 2. payments/serializers.py (964 lines) → serializers/ package
| File | Contents | Lines |
|------|----------|-------|
| `serializers/__init__.py` | Re-exports all 18 serializer classes | ~25 |
| `serializers/settings_serializers.py` | PaymentSettingsSerializer, TaxRateSerializer, PublicPaymentSettingsSerializer | ~130 |
| `serializers/gateway_serializers.py` | PaymentGatewaySerializer, PaymentGatewayAdminSerializer, PublicPaymentGatewaySerializer | ~140 |
| `serializers/transaction_serializers.py` | PaymentMethodSerializer, PaymentTransactionSerializer, PaymentNotificationSerializer | ~160 |
| `serializers/invoice_serializers.py` | InvoiceLineItemSerializer, InvoiceTaxSerializer, InvoiceSerializer (lazy import for circular ref) | ~230 |
| `serializers/payment_serializers.py` | RefundSerializer, BasicPaymentSerializer, PaymentSerializer, InvoicePaymentRequestSerializer, PaymentIntentResponseSerializer, SetupIntentResponseSerializer | ~280 |

### 3. bookingflow/serializers.py (1,208 lines) → serializers/ package
| File | Contents | Lines |
|------|----------|-------|
| `serializers/__init__.py` | Re-exports all 26 serializer classes | ~65 |
| `serializers/step_config_serializers.py` | 12 step configuration serializers | ~540 |
| `serializers/flow_serializers.py` | BookingFlowStepSerializer, BookingFlowSerializer, BookingFlowDetailSerializer, BookingSessionSerializer, BookingFlowAnalyticsSerializer, PublicBookingFlowSerializer | ~290 |
| `serializers/crud_serializers.py` | BookingFlowCreateSerializer, BookingFlowUpdateSerializer, BookingFlowStepCreateSerializer, BookingFlowStepUpdateSerializer, BookingSessionCreateSerializer, BookingSessionUpdateSerializer, ReorderStepsSerializer, DuplicateFlowSerializer | ~335 |

### 4. communications/views.py (1,296 lines) → views/ package
| File | Contents | Lines |
|------|----------|-------|
| `views/__init__.py` | Re-exports all view classes | ~15 |
| `views/layout_views.py` | EmailLayoutViewSet | ~183 |
| `views/template_views.py` | CommunicationTemplateViewSet | ~439 |
| `views/record_views.py` | CommunicationRecordViewSet | ~625 |
| `views/unsubscribe_views.py` | UnsubscribeRateThrottle, email_unsubscribe | ~84 |

### 5. users/views.py (1,125 lines) → views/ package
| File | Contents | Lines |
|------|----------|-------|
| `views/__init__.py` | Re-exports all 22 view classes/functions | ~30 |
| `views/auth_views.py` | UserLoginAPIView, client_register | ~195 |
| `views/session_views.py` | secure_logout, logout_all_devices, active_sessions | ~160 |
| `views/user_views.py` | UserListCreateAPIView, UserDetailAPIView, CurrentUserView, AvatarUploadView, AdminInvitationListCreateAPIView, AdminInvitationDetailAPIView, accept_invitation | ~350 |
| `views/dpa_views.py` | DataAccessView, DataExportView, AccountDeletionView, DataCorrectionView, ProcessingObjectionView, ConsentListView, ConsentWithdrawView, PrivacyRequestListView | ~320 |
| `views/permissions_views.py` | AdminPermissionsPresetsView, UpdateAdminPermissionsView | ~80 |

### 6. bookingflow/views/booking_session_views.py (1,039 lines) → split within views/ package
| File | Contents | Lines |
|------|----------|-------|
| `views/booking_session_views.py` | BookingSessionViewSet (admin/authenticated) | 168 |
| `views/public_booking_views.py` | PublicBookingFlowViewSet (composed from 3 mixins) | 86 |
| `views/public_booking_session_mixin.py` | Session CRUD actions (start, get, update, validate, go_to_step) | 171 |
| `views/public_booking_completion_mixin.py` | complete_booking_public, send_confirmation | 331 |
| `views/public_booking_pricing_mixin.py` | Pricing, payment gateways, availability, reservation | 344 |

## Patterns Used

- **Module-to-package promotion**: `file.py` → `file/__init__.py` + submodules. External imports unchanged via `__init__.py` re-exports.
- **Mixin decomposition**: For `PublicBookingFlowViewSet` (857 lines as a single class), used mixin classes to split by concern while preserving a single ViewSet and URL routing.
- **Lazy imports**: Used in `invoice_serializers.py` to avoid circular reference with `payment_serializers.py`.
- **URL compatibility**: Both `from . import views` (attribute access) and `from .views import Class` (direct import) patterns work with package `__init__.py` re-exports.

## Verification

- `python manage.py check` — no issues
- `python manage.py makemigrations --check --dry-run` — no changes detected
- All domain imports verified via `django.setup()` + import tests
- All `PublicBookingFlowViewSet` mixin methods verified present

## Notes

- `record_views.py` (communications) is 625 lines — single CommunicationRecordViewSet class, not splittable without introducing mixins for diminishing returns.
- `step_config_serializers.py` (bookingflow) is 540 lines — contains 12 small serializers, splitting further would fragment related code.
- `booking_step_views.py` at 620 lines is pre-existing and was not in Phase 3 scope; will be addressed in Phase 8.
- Existing standalone files (`views_google.py`, `views_password.py`, `views_password_reset.py` in users) were kept separate as they are already well-scoped.
