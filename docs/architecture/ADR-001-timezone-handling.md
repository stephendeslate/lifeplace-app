# ADR-001: Naive Datetime Storage with Single Timezone Assumption

## Status
**Accepted** - 2026-01-22

## Context
The LifePlace platform manages physical venue events that ALL occur in the Philippines. The development team includes members in different timezones (US, Philippines).

### Business Requirements
1. All events happen at physical venues in the Philippines
2. Event times must be displayed in Philippine Time (venue local time)
3. Philippines does NOT observe daylight saving time (constant UTC+8 year-round)
4. US-based developers need to work with the system efficiently
5. System must be simple, maintainable, and performant
6. Client bookings (even from international clients) are for Philippine venue times

### Considered Approaches

#### Option 1: USE_TZ=True (Django Default)
**Pros:**
- Django best practice and recommendation
- Automatic timezone conversion
- Future-proof for multi-timezone expansion
- Better handling of datetime edge cases

**Cons:**
- Added complexity for single-timezone business
- Confusing for developers thinking in venue time
- Potential for timezone conversion bugs
- Mental overhead: "what timezone is this datetime in?"
- Database stores UTC, requires conversion for display

#### Option 2: USE_TZ=False with Explicit Documentation (CHOSEN ✅)
**Pros:**
- Simpler reasoning: "what you see is what you get"
- Matches business model (single venue timezone)
- Eliminates conversion bugs
- Developer works in business timezone context
- Database datetimes match venue wall-clock time

**Cons:**
- Breaks if business expands to multiple countries
- Requires explicit timezone labeling in UI/API
- Against Django recommendations
- Less flexible for future changes

## Decision
We will use `USE_TZ=False` with the following mitigations:

1. **All datetimes assumed to be Asia/Manila (UTC+8)**
2. **Explicit PHT labeling** in all user-facing displays
3. **API documentation** clearly states timezone assumption
4. **Dual timezone display** for admin users in different timezones
5. **Timezone metadata fields** in API responses (`timezone`, `timezone_offset`)

## Implementation

### Backend
```python
# backend/core/settings.py
TIME_ZONE = 'Asia/Manila'  # Business timezone
USE_TZ = False  # Store naive datetimes

# backend/core/domains/communications/context_service.py
PHILIPPINES_TZ_DISPLAY = 'PHT'  # Timezone suffix for emails
```

### Frontend
```typescript
// frontend/admin-crm/src/utils/timezone.ts
export const BUSINESS_TIMEZONE = 'Asia/Manila';
export const BUSINESS_TIMEZONE_DISPLAY = 'PHT';
export const BUSINESS_TIMEZONE_OFFSET = '+08:00';

// Always use formatPhilippinesTime() instead of toLocaleDateString()
formatPhilippinesTime(date, true, 'MMM d, yyyy h:mm a')
// Output: "Mar 15, 2026 6:00 PM PHT"
```

### API
```json
{
  "start_date": "2026-03-15T18:00:00",
  "timezone": "Asia/Manila",
  "timezone_offset": "+08:00"
}
```

## Consequences

### Positive Impacts
- ✅ **Simpler codebase**: No timezone conversion logic needed
- ✅ **Matches mental model**: Event at "6pm" means 6pm at the venue
- ✅ **No DST complications**: Philippines doesn't observe DST
- ✅ **Developer efficiency**: US developers work in business timezone
- ✅ **Performance**: No conversion overhead on reads
- ✅ **Clarity**: "2026-03-15 18:00:00" is unambiguous (always PHT)

### Negative Impacts
- ⚠️ **Breaking change required** if expanding to other countries
- ⚠️ **Discipline required**: Must maintain timezone labeling
- ⚠️ **External integrations**: Must communicate timezone explicitly
- ⚠️ **Against Django norms**: Goes against framework recommendations

### Risk Mitigation Strategy

#### 1. UI/UX Mitigations
- ✅ All email templates include "PHT" suffix on times
- ✅ Frontend uses `formatPhilippinesTime()` utility consistently
- ✅ Dual timezone display for admins in different timezones
- ✅ Client portal shows timezone notice for international users

#### 2. API Mitigations
- ✅ API responses include `timezone` and `timezone_offset` fields
- ✅ OpenAPI documentation explains timezone handling
- ✅ Example responses show timezone context

#### 3. Developer Mitigations
- ✅ `DateTimeDisplay` component for React (enforces PHT display)
- ✅ Timezone utilities centralized in `timezone.ts`
- ✅ This ADR document for onboarding new developers

#### 4. Testing Mitigations
- [ ] TODO: Add timezone-specific tests
- [ ] TODO: Test with different browser/OS timezones
- [ ] TODO: Integration tests with international client scenarios

## Review Triggers

Review this decision if:
- Business expands to venues outside Philippines
- More than 10% of clients are international
- Team encounters 3+ timezone-related bugs
- Django releases major timezone handling improvements

## Alternative Considered: Hybrid Approach
We considered storing all times as UTC but displaying in PHT. **Rejected** because:
- Added complexity without clear benefit for single-timezone business
- Still requires timezone conversion logic throughout codebase
- Doesn't match how venue staff think about events

## Migration Path (If Needed)

If business requirements change and we need USE_TZ=True:

1. **Set USE_TZ=True** in settings.py
2. **Write migration** to convert naive datetimes to timezone-aware:
   ```python
   from django.utils import timezone
   import pytz

   manila_tz = pytz.timezone('Asia/Manila')
   for event in Event.objects.all():
       event.start_date = manila_tz.localize(event.start_date)
       event.save()
   ```
3. **Update all `datetime.now()`** calls to `timezone.now()`
4. **Test all datetime operations** thoroughly
5. **Update frontend** to handle timezone-aware responses

**Estimated effort:** 2-3 weeks for full migration and testing

## References

- **Django Timezone Documentation**: https://docs.djangoproject.com/en/5.2/topics/i18n/timezones/
- **Frontend timezone utilities**: `frontend/admin-crm/src/utils/timezone.ts`
- **Backend settings**: `backend/core/settings.py:196` (USE_TZ=False)
- **Email context service**: `backend/core/domains/communications/context_service.py`
- **API serializers**: `backend/core/domains/events/serializers/event_serializers.py`

## Decision Makers
- **Architect**: Stephen Deslate
- **Date**: 2026-01-22
- **Reviewed by**: Claude Code (AI Assistant)

## Change Log
- 2026-01-22: Initial decision documented
- 2026-01-22: Mitigations implemented (email templates, frontend utilities, API metadata)

---

**Last Updated**: 2026-01-22
