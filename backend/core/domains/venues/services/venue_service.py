# backend/core/domains/venues/services/venue_service.py
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

from django.db.models import QuerySet
from django.utils import timezone

from ..models import Venue, VenueOperatingRules, PackageVenue


@dataclass
class CalculatedEventTimes:
    """Data class for calculated event times"""
    program_date: date
    ingress_start: datetime
    program_start: datetime
    program_end: datetime
    egress_end: datetime
    scheduled_checkout: datetime

    # Duration breakdown
    ingress_hours: Decimal
    program_hours: Decimal
    egress_hours: Decimal
    total_hours: Decimal

    # Optional early/late
    early_checkin_time: Optional[datetime] = None
    early_checkin_hours: Optional[Decimal] = None
    early_checkin_fee: Optional[Decimal] = None
    late_checkout_time: Optional[datetime] = None
    late_checkout_hours: Optional[Decimal] = None
    late_checkout_fee: Optional[Decimal] = None


@dataclass
class ValidationResult:
    """Data class for validation results"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]


class VenueService:
    """
    Core venue business logic service.
    Handles time calculations, validation, and venue operations.
    """

    @staticmethod
    def get_active_venues() -> QuerySet[Venue]:
        """Get all active and bookable venues"""
        return Venue.objects.filter(
            is_active=True,
            is_bookable=True
        ).select_related('venue_operating_rules').order_by('sort_order', 'name')

    @staticmethod
    def get_venue_by_id(venue_id: int) -> Optional[Venue]:
        """Get a venue by ID with operating rules"""
        try:
            return Venue.objects.select_related('venue_operating_rules').get(id=venue_id)
        except Venue.DoesNotExist:
            return None

    @staticmethod
    def get_venue_by_code(code: str) -> Optional[Venue]:
        """Get a venue by code with operating rules"""
        try:
            return Venue.objects.select_related('venue_operating_rules').get(code=code.upper())
        except Venue.DoesNotExist:
            return None

    @staticmethod
    def get_package_venues(package_id: int) -> QuerySet[PackageVenue]:
        """Get all venues for a package, ordered by access_order"""
        return PackageVenue.objects.filter(
            package_id=package_id
        ).select_related(
            'venue', 'venue__venue_operating_rules'
        ).order_by('access_order')

    @staticmethod
    def get_primary_venue_for_package(package_id: int) -> Optional[Venue]:
        """Get the primary venue for a package"""
        try:
            package_venue = PackageVenue.objects.select_related(
                'venue', 'venue__venue_operating_rules'
            ).get(package_id=package_id, is_primary=True)
            return package_venue.venue
        except PackageVenue.DoesNotExist:
            # Fallback to first venue if no primary set
            first_pv = PackageVenue.objects.filter(
                package_id=package_id
            ).select_related('venue', 'venue__venue_operating_rules').first()
            return first_pv.venue if first_pv else None

    @staticmethod
    def calculate_event_times(
        venue: Venue,
        program_date: date,
        program_start_time: time,
        program_hours: Decimal,
        custom_ingress_hours: Optional[Decimal] = None,
        custom_egress_hours: Optional[Decimal] = None,
        early_checkin_hours: Optional[Decimal] = None,
        late_checkout_hours: Optional[Decimal] = None,
    ) -> CalculatedEventTimes:
        """
        Calculate all event times based on venue operating rules.

        Args:
            venue: The venue with operating rules
            program_date: Date of the program
            program_start_time: Start time of the program
            program_hours: Duration of the program in hours
            custom_ingress_hours: Custom ingress hours (if allowed)
            custom_egress_hours: Custom egress hours (if allowed)
            early_checkin_hours: Hours early for check-in (if allowed)
            late_checkout_hours: Hours late for checkout (if allowed)

        Returns:
            CalculatedEventTimes with all calculated times and fees
        """
        rules = venue.venue_operating_rules if hasattr(venue, 'venue_operating_rules') else None

        program_hours = Decimal(str(program_hours))

        # Determine ingress/egress hours
        if rules:
            ingress_hours = Decimal(str(custom_ingress_hours)) if custom_ingress_hours else rules.ingress_hours
            egress_hours = Decimal(str(custom_egress_hours)) if custom_egress_hours else rules.egress_hours
        else:
            ingress_hours = Decimal(str(custom_ingress_hours or 0))
            egress_hours = Decimal(str(custom_egress_hours or 0))

        # Calculate program start datetime
        program_start = datetime.combine(program_date, program_start_time)

        # Make timezone aware
        if timezone.is_naive(program_start):
            program_start = timezone.make_aware(program_start)

        # Calculate ingress start (before program)
        ingress_start = program_start - timedelta(hours=float(ingress_hours))

        # Calculate program end
        program_end = program_start + timedelta(hours=float(program_hours))

        # Calculate egress end
        egress_end = program_end + timedelta(hours=float(egress_hours))

        # Calculate scheduled checkout
        if rules and venue.is_overnight:
            # For overnight venues, checkout is on the next day at default checkout time
            checkout_date = program_date + timedelta(days=1) if rules.checkout_next_day else program_date
            scheduled_checkout = datetime.combine(checkout_date, rules.default_checkout_time)
            if timezone.is_naive(scheduled_checkout):
                scheduled_checkout = timezone.make_aware(scheduled_checkout)
        else:
            # For day venues, checkout is at egress end
            scheduled_checkout = egress_end

        # Calculate total hours
        total_hours = ingress_hours + program_hours + egress_hours

        # Create result
        result = CalculatedEventTimes(
            program_date=program_date,
            ingress_start=ingress_start,
            program_start=program_start,
            program_end=program_end,
            egress_end=egress_end,
            scheduled_checkout=scheduled_checkout,
            ingress_hours=ingress_hours,
            program_hours=program_hours,
            egress_hours=egress_hours,
            total_hours=total_hours,
        )

        # Calculate early check-in if requested
        if early_checkin_hours and rules and rules.early_checkin_allowed:
            early_checkin_hours = Decimal(str(early_checkin_hours))
            default_checkin = datetime.combine(program_date, rules.default_check_in_time)
            if timezone.is_naive(default_checkin):
                default_checkin = timezone.make_aware(default_checkin)

            result.early_checkin_time = default_checkin - timedelta(hours=float(early_checkin_hours))
            result.early_checkin_hours = early_checkin_hours
            result.early_checkin_fee = rules.calculate_early_checkin_fee(early_checkin_hours)

        # Calculate late checkout if requested
        if late_checkout_hours and rules and rules.late_checkout_allowed:
            late_checkout_hours = Decimal(str(late_checkout_hours))
            result.late_checkout_time = scheduled_checkout + timedelta(hours=float(late_checkout_hours))
            result.late_checkout_hours = late_checkout_hours
            result.late_checkout_fee = rules.calculate_late_checkout_fee(late_checkout_hours)

        return result

    @staticmethod
    def validate_booking_request(
        venue: Venue,
        program_date: date,
        program_start_time: time,
        program_hours: Decimal,
        guest_count: Optional[int] = None,
    ) -> ValidationResult:
        """
        Validate a booking request against venue rules.

        Args:
            venue: The venue to validate against
            program_date: Proposed program date
            program_start_time: Proposed start time
            program_hours: Proposed duration
            guest_count: Number of guests (optional)

        Returns:
            ValidationResult with is_valid, errors, and warnings
        """
        errors = []
        warnings = []
        rules = venue.venue_operating_rules if hasattr(venue, 'venue_operating_rules') else None

        if not rules:
            return ValidationResult(
                is_valid=True,
                errors=[],
                warnings=['No operating rules configured for this venue']
            )

        program_hours = Decimal(str(program_hours))

        # Validate program duration
        duration_validation = rules.validate_program_duration(program_hours)
        errors.extend(duration_validation['errors'])
        warnings.extend(duration_validation['warnings'])

        # Validate guest count
        if guest_count:
            if guest_count < venue.minimum_capacity:
                errors.append(f"Guest count ({guest_count}) is below minimum capacity ({venue.minimum_capacity})")
            if guest_count > venue.maximum_capacity:
                errors.append(f"Guest count ({guest_count}) exceeds maximum capacity ({venue.maximum_capacity})")

        # Validate program start time
        if rules.earliest_start_time and program_start_time < rules.earliest_start_time:
            errors.append(f"Program cannot start before {rules.earliest_start_time.strftime('%I:%M %p')}")

        # Validate program end time (considering music curfew)
        if rules.latest_end_time:
            calculated_times = VenueService.calculate_event_times(
                venue=venue,
                program_date=program_date,
                program_start_time=program_start_time,
                program_hours=program_hours,
            )
            program_end_time = calculated_times.program_end.time()

            if program_end_time > rules.latest_end_time:
                warnings.append(
                    f"Program ends at {program_end_time.strftime('%I:%M %p')}, "
                    f"which is after the recommended end time of {rules.latest_end_time.strftime('%I:%M %p')} "
                    f"(e.g., music curfew)"
                )

        # Validate hard cutoff
        if rules.hard_cutoff_time:
            calculated_times = VenueService.calculate_event_times(
                venue=venue,
                program_date=program_date,
                program_start_time=program_start_time,
                program_hours=program_hours,
            )
            egress_end_time = calculated_times.egress_end.time()

            # Handle next-day cutoff
            cutoff_date = program_date
            if rules.hard_cutoff_next_day:
                cutoff_date = program_date + timedelta(days=1)

            cutoff_datetime = datetime.combine(cutoff_date, rules.hard_cutoff_time)
            if timezone.is_naive(cutoff_datetime):
                cutoff_datetime = timezone.make_aware(cutoff_datetime)

            if calculated_times.egress_end > cutoff_datetime:
                errors.append(
                    f"All activities must conclude by {rules.hard_cutoff_time.strftime('%I:%M %p')}. "
                    f"Current egress ends at {calculated_times.egress_end.strftime('%I:%M %p')}"
                )

        # Validate date is not too soon or too far
        today = timezone.now().date()
        if program_date < today:
            errors.append("Cannot book for a past date")

        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
        )

    @staticmethod
    def get_available_time_slots(
        venue: Venue,
        program_date: date,
        program_hours: Decimal = Decimal('3'),
    ) -> List[Dict[str, Any]]:
        """
        Get available time slots for a venue on a specific date.

        Args:
            venue: The venue
            program_date: Date to check
            program_hours: Proposed program duration

        Returns:
            List of available time slots with validation info
        """
        rules = venue.venue_operating_rules if hasattr(venue, 'venue_operating_rules') else None

        if not rules:
            # No rules, return generic slots
            return [
                {'time': time(hour=h, minute=0), 'is_available': True, 'validation': None}
                for h in range(8, 22)  # 8 AM to 10 PM
            ]

        slots = []
        start_hour = rules.earliest_start_time.hour if rules.earliest_start_time else 8
        end_hour = 22  # Default end

        for hour in range(start_hour, end_hour):
            slot_time = time(hour=hour, minute=0)
            validation = VenueService.validate_booking_request(
                venue=venue,
                program_date=program_date,
                program_start_time=slot_time,
                program_hours=program_hours,
            )
            slots.append({
                'time': slot_time.strftime('%H:%M'),
                'time_display': slot_time.strftime('%I:%M %p'),
                'is_available': validation.is_valid,
                'errors': validation.errors,
                'warnings': validation.warnings,
            })

        return slots

    @staticmethod
    def calculate_total_fees(
        venue: Venue,
        program_hours: Decimal,
        early_checkin_hours: Optional[Decimal] = None,
        late_checkout_hours: Optional[Decimal] = None,
    ) -> Dict[str, Decimal]:
        """
        Calculate all fees for a booking (early check-in, late checkout, etc.)

        Args:
            venue: The venue
            program_hours: Program duration
            early_checkin_hours: Hours early for check-in
            late_checkout_hours: Hours late for checkout

        Returns:
            Dict with fee breakdown
        """
        rules = venue.venue_operating_rules if hasattr(venue, 'venue_operating_rules') else None

        fees = {
            'early_checkin_fee': Decimal('0.00'),
            'late_checkout_fee': Decimal('0.00'),
            'total_fees': Decimal('0.00'),
        }

        if not rules:
            return fees

        if early_checkin_hours and rules.early_checkin_allowed:
            fees['early_checkin_fee'] = rules.calculate_early_checkin_fee(
                Decimal(str(early_checkin_hours))
            )

        if late_checkout_hours and rules.late_checkout_allowed:
            fees['late_checkout_fee'] = rules.calculate_late_checkout_fee(
                Decimal(str(late_checkout_hours))
            )

        fees['total_fees'] = fees['early_checkin_fee'] + fees['late_checkout_fee']

        return fees
