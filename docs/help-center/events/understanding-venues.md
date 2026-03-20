# Understanding Venues

**Important:** Venues in LifePlace represent venue types, not individual physical units.

"Cabana" is one venue in the system -- even if the property has Cabana 1 and Cabana 2. The system does not track which specific unit a client is assigned to.

## Why It Works This Way

LifePlace is designed for a single property where venue unit assignment is handled operationally on-site. The system focuses on date-level availability for the whole facility rather than per-unit inventory.

## What This Means for Staff

- When a client books "Cabana," they are booking the Cabana venue type -- not a specific unit.
- Assigning a specific unit is done by staff on-site or via internal notes on the event.
- Some venue types are pre-grouped (e.g., "Cabana 1&2" represents two physical units as one bookable venue).
- Date blocking is facility-wide -- a permanent block reserves the entire facility for that date.
- Use venue blocked dates for administrative blocks (maintenance, closures) on specific venues.

## How Venue Availability Is Managed

Venue availability is controlled through three mechanisms:

- **Event date blocking** (primary) -- temporary holds and permanent blocks tied to events.
- **Venue Blocked Dates** (administrative) -- block full days or time ranges for specific venues.
- **VenueOperatingRules** -- check-in/out times, program duration limits, and ingress/egress buffers per venue.

Each venue can have event-type-specific configurations. For example, "Open Field" might include 3 hours for weddings but 24 hours for camping events.
