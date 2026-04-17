"""
Commande : python manage.py seed_shifts
Crée des shifts du 17 avril au 30 juin 2026 pour toutes les unités de soins.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
import random

from planning.models import Shift, ShiftType
from hospital.models import CareUnit


class Command(BaseCommand):
    help = "Génère des shifts du 17 avril au 30 juin 2026"

    def handle(self, *args, **options):
        care_units  = list(CareUnit.objects.all())
        shift_types = list(ShiftType.objects.all())

        if not care_units:
            self.stdout.write(self.style.ERROR("❌ Aucune unité de soins en base. Lance d'abord un seed général."))
            return

        if not shift_types:
            self.stdout.write(self.style.ERROR("❌ Aucun type de shift en base."))
            return

        # Définition des créneaux horaires par type de nom
        SLOT_HOURS = {
            "matin":       (7,  15),
            "après-midi":  (15, 23),
            "nuit":        (21,  7),  # +1 jour pour end
            "jour":        (7,  19),
            "garde":       (8,  8),   # 24h
        }

        def get_hours(shift_type):
            name = shift_type.name.lower()
            for key, hours in SLOT_HOURS.items():
                if key in name:
                    return hours
            return (8, 16)  # fallback

        start_date = datetime(2026, 4, 17).date()
        end_date   = datetime(2026, 6, 30).date()

        created = 0
        skipped = 0
        current = start_date

        while current <= end_date:
            for care_unit in care_units:
                # 1 à 2 shifts par unité par jour (aléatoire)
                if current.day % 2 == 0:  # un jour sur deux
                    used_types = [random.choice(shift_types)]
                else:
                    used_types = []
                    
                for shift_type in used_types:
                    start_h, end_h = get_hours(shift_type)

                    start_dt = timezone.make_aware(
                        datetime(current.year, current.month, current.day, start_h, 0)
                    )

                    # Nuit et garde 24h : end le lendemain
                    if end_h <= start_h:
                        end_day = current + timedelta(days=1)
                        end_dt = timezone.make_aware(
                            datetime(end_day.year, end_day.month, end_day.day, end_h, 0)
                        )
                    else:
                        end_dt = timezone.make_aware(
                            datetime(current.year, current.month, current.day, end_h, 0)
                        )

                    # Éviter les doublons
                    exists = Shift.objects.filter(
                        care_unit=care_unit,
                        shift_type=shift_type,
                        start_datetime=start_dt,
                    ).exists()

                    if exists:
                        skipped += 1
                        continue

                    Shift.objects.create(
                        care_unit=care_unit,
                        shift_type=shift_type,
                        start_datetime=start_dt,
                        end_datetime=end_dt,
                        min_staff=random.randint(1, 3),
                        max_staff=random.randint(4, 8),
                    )
                    created += 1

            current += timedelta(days=1)

        self.stdout.write(self.style.SUCCESS(
            f"✅ {created} shifts créés, {skipped} ignorés (doublons)."
        ))