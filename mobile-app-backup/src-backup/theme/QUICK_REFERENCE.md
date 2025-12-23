# LifePlace Theme Quick Reference

> **Platform**: Venue Event Booking (NOT hotel booking)
> **Currency**: PHP (₱)
> **Timezone**: Asia/Manila

## Colors at a Glance

### Primary Actions
```
Charcoal:    #32373C  ← Buttons, headers, active states
Light:       #4A5056  ← Secondary icons
Dark:        #1E2226  ← Pressed states
```

### Accent (Brand Highlight)
```
Lavender:    #A886CD  ← Special elements, badges, links
Light:       #C4A8E3  ← Hover
Dark:        #8A6AAE  ← Pressed
Subtle:      #F5F0FA  ← Tinted backgrounds
```

### Secondary (Nature/Success)
```
Sage:        #4AA485  ← Success, confirmations, PAID status
Light:       #6BB99D  ← Hover
Dark:        #3A8A6D  ← Pressed
Subtle:      #EDF7F3  ← Tinted backgrounds
```

### Neutrals
```
White:       #FFFFFF  ← Primary background
Cream:       #FAF9F7  ← Warm background
Sand:        #F5F3EF  ← Cards, inputs
Warm Gray:   #E8E5E0  ← Borders
Gray:        #9B9590  ← Placeholders
Dark Gray:   #6B6560  ← Secondary text
```

### Semantic / Status Colors
```
Success:     #4AA485  ← CONFIRMED, PAID
Warning:     #E5A84B  ← PARTIALLY_PAID, OVERDUE
Error:       #D64545  ← CANCELLED, UNPAID
Info:        #5B8DEF  ← LEAD status
```

---

## Spacing Scale
```
xxs:  4     xs:  8     sm:  12    md:  16
lg:  20     xl: 24     xxl: 32    xxxl: 40
```

---

## Border Radius
```
xs:   4    ← Small elements
sm:   8    ← Chips, small cards
md:  12    ← Buttons, inputs
lg:  16    ← Standard cards
xl:  24    ← Featured cards, sheets
full: 9999 ← Pills, avatars
```

---

## Typography Cheat Sheet

| Use Case | Style | Size | Weight |
|----------|-------|------|--------|
| Hero text | `displayLarge` | 36 | Bold |
| Page title | `headlineLarge` | 28 | Semibold |
| Section header | `headlineSmall` | 20 | Semibold |
| Card title | `titleLarge` | 18 | Semibold |
| Item title | `titleMedium` | 16 | Semibold |
| Body text | `bodyMedium` | 14 | Regular |
| Small text | `bodySmall` | 12 | Regular |
| Button label | `labelLarge` | 14 | Medium |
| Chip label | `labelMedium` | 12 | Medium |
| Caption | `labelSmall` | 10 | Medium |
| Main price | `priceMain` | 24 | Bold |

---

## Backend Entity → Component Mapping

### Venue
```typescript
// Display with: VenueCard, venueCardFeatured, venueCardCompact
Venue.name               → Card title
Venue.description        → Card description
Venue.featured_image     → Card image
Venue.gallery_images     → Detail screen carousel
Venue.minimum_capacity   → "👥 50-100 guests"
Venue.maximum_capacity   →
Venue.is_overnight       → "Overnight" badge (lavender)
Venue.location_description → Location text
```

### ProductOption (Package/Add-on)
```typescript
// Display with: PackageCard, selectionCard
ProductOption.name           → Card title
ProductOption.description    → Card description
ProductOption.base_price     → Price display "₱5,000"
ProductOption.pricing_model  → "/hour" suffix if HOURLY
ProductOption.type           → PACKAGE or PRODUCT (add-on)
ProductOption.minimum_guests → "👥 50-100"
ProductOption.maximum_guests →
ProductOption.minimum_hours  → "⏱️ 8hrs"
ProductOption.event_days     → "📅 2D1N" for multi-day
```

### Event (Booking)
```typescript
// Display with: EventCard
Event.name              → Card title
Event.status            → Status badge (see colors below)
Event.payment_status    → Payment badge
Event.start_date        → "📅 Dec 15, 2024"
Event.end_date          →
Event.venue             → Venue name display
Event.num_participants  → "👥 75 guests"
Event.total_amount_due  → "₱15,232"
Event.total_amount_paid → "₱7,500 / ₱15,232"
```

### BookingSession
```typescript
// Display with: progressStyles, bookingFlowStyles
BookingSession.progress_percentage → Progress bar fill width
BookingSession.current_step        → Active step highlight
BookingSession.completed_steps     → Step dots filled
```

---

## Status Badge Colors

### Event Status (Event.status)
| Status | Color | Style |
|--------|-------|-------|
| `LEAD` | Info (#5B8DEF) | `chipStyles.statusLead` |
| `CONFIRMED` | Sage (#4AA485) | `chipStyles.statusConfirmed` |
| `COMPLETED` | Dark Gray (#6B6560) | `chipStyles.statusCompleted` |
| `CANCELLED` | Error (#D64545) | `chipStyles.statusCancelled` |

### Payment Status (Event.payment_status)
| Status | Color | Style |
|--------|-------|-------|
| `UNPAID` | Error (#D64545) | `chipStyles.paymentUnpaid` |
| `PARTIALLY_PAID` | Warning (#E5A84B) | `chipStyles.paymentPartiallyPaid` |
| `PAID` | Sage (#4AA485) | `chipStyles.paymentPaid` |

### Installment Status (PaymentInstallment.status)
| Status | Color |
|--------|-------|
| `PENDING` | Warning |
| `PAID` | Sage |
| `OVERDUE` | Error |
| `PARTIAL` | Warning |

---

## Component Heights
```
Button:     52px    Button (small): 40px
Input:      52px    Header:         56px
Bottom Nav: 80px
```

---

## Common Patterns

### Venue Card
```tsx
<View style={cardStyles.venueCardFeatured}>
  <Image source={{ uri: venue.featured_image }} style={cardStyles.venueCardImage} />
  {venue.is_overnight && (
    <View style={cardStyles.venueCardOvernightBadge}>
      <Text style={cardStyles.venueCardOvernightText}>Overnight</Text>
    </View>
  )}
  <LinearGradient style={cardStyles.venueCardGradient} />
  <View style={cardStyles.venueCardContent}>
    <Text style={cardStyles.venueCardTitle}>{venue.name}</Text>
    <Text style={cardStyles.venueCardCapacity}>
      👥 {venue.minimum_capacity}-{venue.maximum_capacity} guests
    </Text>
  </View>
</View>
```

### Event Status Badge
```tsx
<View style={[
  chipStyles.statusBadgeBase,
  chipStyles[`status${event.status}`] // statusLead, statusConfirmed, etc.
]}>
  <Text style={chipStyles.statusBadgeText}>{event.status}</Text>
</View>
```

### Price Display (PHP)
```tsx
<View style={priceStyles.priceContainer}>
  <Text style={priceStyles.priceMain}>₱{formatNumber(product.base_price)}</Text>
  {product.pricing_model === 'HOURLY' && (
    <Text style={priceStyles.priceUnit}>/hour</Text>
  )}
</View>
```

### Payment Progress
```tsx
<View style={priceStyles.paymentProgress}>
  <Text style={priceStyles.paidAmount}>₱{formatNumber(event.total_amount_paid)}</Text>
  <Text style={priceStyles.separator}>/</Text>
  <Text style={priceStyles.totalAmount}>₱{formatNumber(event.total_amount_due)}</Text>
</View>
```

### Booking Flow Selection Card
```tsx
<Pressable style={[
  bookingFlowStyles.selectionCard,
  isSelected && bookingFlowStyles.selectionCardSelected
]}>
  <Image source={{ uri: venue.featured_image }} style={bookingFlowStyles.selectionCardImage} />
  <View style={bookingFlowStyles.selectionCardContent}>
    <Text style={bookingFlowStyles.selectionCardTitle}>{venue.name}</Text>
    <Text style={bookingFlowStyles.selectionCardMeta}>
      👥 {venue.minimum_capacity}-{venue.maximum_capacity}
    </Text>
    <Text style={bookingFlowStyles.selectionCardPrice}>
      ₱{formatNumber(venue.standalone_base_price)}/hr
    </Text>
  </View>
  <View style={[
    bookingFlowStyles.selectionCardCheckbox,
    isSelected && bookingFlowStyles.selectionCardCheckboxSelected
  ]}>
    {isSelected && <CheckIcon color="white" size={16} />}
  </View>
</Pressable>
```

---

## Icon Mapping

### Navigation
| Screen | Icon |
|--------|------|
| Home | `house` |
| My Events | `calendar-blank` |
| Favorites | `heart` |
| Profile | `user` |

### Venue/Event Info
| Data | Icon |
|------|------|
| Capacity | `users` |
| Duration/Hours | `clock` |
| Date | `calendar` |
| Overnight | `moon` |
| Day Event | `sun` |
| Location | `map-pin` |

### Booking Flow Steps
| Step | Icon |
|------|------|
| `venue_selection` | `buildings` |
| `date_time` | `calendar-check` |
| `package_selection` | `package` |
| `addon_selection` | `plus-circle` |
| `pricing_summary` | `list-checks` |
| `contact_info` | `address-book` |
| `payment_info` | `wallet` |
| `confirmation` | `seal-check` |

---

## Imports

```tsx
// All-in-one
import theme from '@/theme';

// Individual exports
import {
  colors,
  spacing,
  layout,
  shadows,
  typeScale,
} from '@/theme';

// Component styles
import {
  buttonStyles,
  cardStyles,
  chipStyles,
  inputStyles,
  navigationStyles,
  priceStyles,
  progressStyles,
  bookingFlowStyles,
  venueInfoStyles,
} from '@/theme/components';
```

---

## Key Calculations

| What | Formula |
|------|---------|
| Event Total | Sum of `EventProductOption.final_price` |
| Remaining Balance | `total_amount_due - total_amount_paid` |
| Booking Progress | `(completed_steps.length / total_steps) * 100` |
| Price with Tax | `base_price * (1 + tax_rate/100)` if not inclusive |
| Display Price | Format as `₱X,XXX.XX` |

---

*Quick Reference v1.1 - Updated for backend alignment*
