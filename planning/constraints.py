from datetime import timedelta
from django.db.models import Q, Sum

from planning.models import ShiftAssignment
from personnel.models import Staff, Contract, StaffCertification

def check_overlap(staff, shift):
    errors = []

    overlaps = ShiftAssignment.objects.filter(
        staff=staff,
        shift__start_datetime__lt=shift.end_datetime,
        shift__end_datetime__gt=shift.start_datetime
    )

    if overlaps.exists():
        errors.append("Chevauchement avec une autre garde.")

    return errors

from planning.models import Absence

def check_absence(staff, shift):
    errors = []

    absences = Absence.objects.filter(
        staff=staff,
        start_date__lte=shift.start_datetime.date(),
        expected_end_date__gte=shift.start_datetime.date()
    )

    if absences.exists():
        errors.append("Soignant en absence pendant cette période.")

    return errors

def check_certifications(staff, shift):
    errors = []

    required = shift.shiftrequiredcertification_set.all()

    for req in required:
        ok = StaffCertification.objects.filter(
            staff=staff,
            certification=req.certification
        ).exists()

        if not ok:
            errors.append(f"Certification manquante : {req.certification.name}")

    return errors

def check_rest_after_night(staff, shift):
    errors = []

    last_shift = ShiftAssignment.objects.filter(
        staff=staff
    ).order_by("-shift__end_datetime").first()

    if last_shift:
        prev = last_shift.shift

        if prev.shift_type.requires_rest_after:
            gap = shift.start_datetime - prev.end_datetime

            if gap < timedelta(hours=11):
                errors.append("Repos insuffisant après garde de nuit.")

    return errors

def check_weekly_hours(staff, shift):
    errors = []

    week_hours = ShiftAssignment.objects.filter(
        staff=staff,
        shift__start_datetime__week=shift.start_datetime.isocalendar().week
    ).aggregate(
        total=Sum("shift__shift_type__duration_hours")
    )["total"] or 0

    new_total = week_hours + shift.shift_type.duration_hours

    if new_total > 48:
        errors.append("Quota hebdomadaire dépassé.")

    return errors

def validate_shift_assignment(staff, shift):
    errors = []

    errors += check_overlap(staff, shift)
    errors += check_absence(staff, shift)
    errors += check_certifications(staff, shift)
    errors += check_rest_after_night(staff, shift)
    errors += check_weekly_hours(staff, shift)

    return errors