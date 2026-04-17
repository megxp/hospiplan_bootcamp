# planning/generator.py

from datetime import timedelta
from .models import Shift, ShiftAssignment, PatientLoad
from .constraints import validate_shift_assignment
from personnel.models import Staff

SURGE_KEYWORDS = ("sur-activite", "sur activité", "sur-activité", "suractivite")
SURGE_OCCUPANCY_THRESHOLD = 0.85


def is_public_holiday(shift_date):
    """MVP: fixed-date public holidays used for fairness scoring."""
    fixed_holidays = {
        (1, 1),    # Jour de l'an
        (5, 1),    # Fete du Travail
        (5, 8),    # Victoire 1945
        (7, 14),   # Fete nationale
        (8, 15),   # Assomption
        (11, 1),   # Toussaint
        (11, 11),  # Armistice
        (12, 25),  # Noel
    }
    return (shift_date.month, shift_date.day) in fixed_holidays


def is_weekend_or_holiday(shift_datetime):
    shift_date = shift_datetime.date()
    return shift_datetime.weekday() >= 5 or is_public_holiday(shift_date)


def is_surge_shift(shift):
    shift_type_name = (shift.shift_type.name or "").strip().lower()
    return any(keyword in shift_type_name for keyword in SURGE_KEYWORDS)


def is_surge_shift_active(shift):
    if not is_surge_shift(shift):
        return True
    load = PatientLoad.objects.filter(
        care_unit=shift.care_unit,
        date=shift.start_datetime.date(),
    ).first()
    return bool(load and load.occupancy_rate >= SURGE_OCCUPANCY_THRESHOLD)


# ─────────────────────────────────────────────
# SCORE DES CONTRAINTES MOLLES
# ─────────────────────────────────────────────

def compute_soft_score(staff, shift, period_start, period_end):
    """
    Calcule un score de pénalité pour une affectation candidate.
    Plus le score est BAS, plus le soignant est un bon choix.
    """
    penalty = 0

    # S-01 — Équilibre de charge : favoriser le moins chargé
    nb_gardes = ShiftAssignment.objects.filter(
        staff=staff,
        shift__start_datetime__gte=period_start,
        shift__start_datetime__lte=period_end,
    ).count()
    penalty += nb_gardes * 10  # poids 10 par garde déjà planifiée

    # S-02 — Nuits consécutives : pénaliser si déjà plusieurs nuits d'affilée
    if shift.shift_type.requires_rest_after:
        last_nights = ShiftAssignment.objects.filter(
            staff=staff,
            shift__shift_type__requires_rest_after=True,
            shift__end_datetime__lte=shift.start_datetime,
            shift__end_datetime__gte=shift.start_datetime - timedelta(days=3),
        ).count()
        penalty += last_nights * 20  # poids 20 par nuit consécutive récente

    # S-03 — Changement de service dans la semaine
    week_start = shift.start_datetime - timedelta(days=shift.start_datetime.weekday())
    week_end   = week_start + timedelta(days=7)
    other_units = ShiftAssignment.objects.filter(
        staff=staff,
        shift__start_datetime__gte=week_start,
        shift__start_datetime__lt=week_end,
    ).exclude(
        shift__care_unit=shift.care_unit
    ).values('shift__care_unit').distinct().count()
    penalty += other_units * 15  # poids 15 par unité différente cette semaine

    # S-04 — Week-end/Jour férié : équité sur la période
    if is_weekend_or_holiday(shift.start_datetime):
        period_assignments = ShiftAssignment.objects.filter(
            staff=staff,
            shift__start_datetime__gte=period_start,
            shift__start_datetime__lte=period_end,
        ).select_related("shift")
        weekend_or_holiday_count = sum(
            1
            for assignment in period_assignments
            if is_weekend_or_holiday(assignment.shift.start_datetime)
        )
        penalty += weekend_or_holiday_count * 25  # poids 25 par garde déjà attribuée

    return penalty


# ─────────────────────────────────────────────
# HEURISTIQUE GLOUTONNE
# ─────────────────────────────────────────────

def generate_planning(period_start, period_end):
    """
    Génère un planning glouton sur la période [period_start, period_end].

    Algorithme :
    1. Récupérer tous les shifts de la période, triés par date
    2. Pour chaque shift :
       a. Récupérer les soignants actifs légaux (contraintes dures OK)
       b. Les trier par score de pénalité croissant (contraintes molles)
       c. Affecter les N meilleurs jusqu'à min_staff atteint
    3. Retourner le planning créé + le score global
    """

    results = []
    total_score = 0
    unmet_shifts = []

    shifts = Shift.objects.filter(
        start_datetime__gte=period_start,
        end_datetime__lte=period_end,
    ).order_by('start_datetime').select_related('shift_type', 'care_unit')

    all_staff = Staff.objects.filter(is_active=True)

    for shift in shifts:
        if not is_surge_shift_active(shift):
            continue

        candidates = []

        for staff in all_staff:
            errors = validate_shift_assignment(staff, shift)
            if errors:
                continue  # contrainte dure violée → éliminé

            score = compute_soft_score(staff, shift, period_start, period_end)
            candidates.append((score, staff))

        # Trier par score croissant (meilleur en premier)
        candidates.sort(key=lambda x: x[0])

        assigned_count = 0
        shift_assignments = []

        for score, staff in candidates:
            if assigned_count >= shift.min_staff:
                break

            assignment = ShiftAssignment.objects.create(
                shift=shift,
                staff=staff,
            )
            shift_assignments.append({
                "staff_id":   staff.id,
                "staff_name": str(staff),
                "penalty":    score,
            })
            total_score += score
            assigned_count += 1

        shift_result = {
            "shift_id":        shift.id,
            "shift":           str(shift),
            "required":        shift.min_staff,
            "assigned":        assigned_count,
            "fully_covered":   assigned_count >= shift.min_staff,
            "assignments":     shift_assignments,
        }

        if assigned_count < shift.min_staff:
            unmet_shifts.append(str(shift))

        results.append(shift_result)

    return {
        "period_start":  str(period_start),
        "period_end":    str(period_end),
        "total_score":   total_score,
        "unmet_shifts":  unmet_shifts,
        "planning":      results,
    }