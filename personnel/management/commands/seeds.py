"""
python manage.py seed          → peuple tout
python manage.py seed --flush  → vide d'abord, puis repeuple
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from faker import Faker
import random
from datetime import date, timedelta, datetime

# ── Imports modèles ───────────────────────────────────────────────
from personnel.models import (
    Staff, Role, StaffRole,
    Specialty, StaffSpecialty,
    ContractType, Contract,
    Certification, StaffCertification,
    Preference,
)
from hospital.models import (
    Service, CareUnit,
    ServiceStatus, StaffServiceAssignment
)
from planning.models import (
    ShiftType, Shift, ShiftRequiredCertification,
    ShiftAssignment,
    AbsenceType, Absence,
    PatientLoad, Rule
)

fake = Faker("fr_FR")   # données en français


class Command(BaseCommand):
    help = "Peuple la base de données avec des données de test réalistes"

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Vide toutes les tables avant de peupler"
        )

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   POINT D'ENTRÉE
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    @transaction.atomic
    def handle(self, *args, **options):

        if options["flush"]:
            self.flush_all()

        self.stdout.write("\n🌱 Démarrage du seed...\n")

        roles          = self.seed_roles()
        specialties    = self.seed_specialties()
        contract_types = self.seed_contract_types()
        certifications = self.seed_certifications()
        absence_types  = self.seed_absence_types()
        shift_types    = self.seed_shift_types()
        rules          = self.seed_rules()
        services       = self.seed_services()
        care_units     = self.seed_care_units(services)
        staff          = self.seed_staff(
                            roles, specialties,
                            contract_types, certifications,
                            services
                        )
        shifts         = self.seed_shifts(care_units, shift_types, certifications)
        self.seed_assignments(staff, shifts)
        self.seed_absences(staff, absence_types)
        self.seed_patient_loads(care_units)

        self.stdout.write(self.style.SUCCESS("\n✅ Seed terminé avec succès !\n"))
        self.print_summary()

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   FLUSH
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    def flush_all(self):
        self.stdout.write("🗑️  Nettoyage des tables...")
        # Ordre important (FK)
        ShiftAssignment.objects.all().delete()
        ShiftRequiredCertification.objects.all().delete()
        Shift.objects.all().delete()
        Absence.objects.all().delete()
        PatientLoad.objects.all().delete()
        StaffServiceAssignment.objects.all().delete()
        StaffCertification.objects.all().delete()
        StaffSpecialty.objects.all().delete()
        StaffRole.objects.all().delete()
        Contract.objects.all().delete()
        Preference.objects.all().delete()
        Staff.objects.all().delete()
        CareUnit.objects.all().delete()
        ServiceStatus.objects.all().delete()
        Service.objects.all().delete()
        ShiftType.objects.all().delete()
        AbsenceType.objects.all().delete()
        ContractType.objects.all().delete()
        Certification.objects.all().delete()
        Specialty.objects.all().delete()
        Role.objects.all().delete()
        Rule.objects.all().delete()
        self.stdout.write(self.style.WARNING("   Tables vidées.\n"))

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   F-01  RÔLES
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    def seed_roles(self):
        self.stdout.write("👔 Rôles...")
        noms = [
            "Médecin", "Infirmier(e)", "Aide-soignant(e)",
            "Sage-femme", "Kinésithérapeute",
            "Radiologue", "Anesthésiste", "Urgentiste",
        ]
        roles = []
        for nom in noms:
            r, _ = Role.objects.get_or_create(name=nom)
            roles.append(r)
        self.stdout.write(f"   → {len(roles)} rôles")
        return roles

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   F-01  SPÉCIALITÉS (avec hiérarchie)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    def seed_specialties(self):
        self.stdout.write("🏷️  Spécialités...")
        tree = {
            "Chirurgie":       ["Chirurgie cardiaque", "Chirurgie orthopédique", "Neurochirurgie"],
            "Médecine interne":["Cardiologie", "Pneumologie", "Gastroentérologie"],
            "Urgences":        ["Urgences pédiatriques", "Urgences adultes"],
            "Réanimation":     ["Réanimation néonatale", "Réanimation adulte"],
        }
        specs = []
        for parent_name, children in tree.items():
            parent, _ = Specialty.objects.get_or_create(name=parent_name, parent=None)
            specs.append(parent)
            for child_name in children:
                child, _ = Specialty.objects.get_or_create(name=child_name, parent=parent)
                specs.append(child)
        self.stdout.write(f"   → {len(specs)} spécialités")
        return specs

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   F-02  TYPES DE CONTRAT
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    def seed_contract_types(self):
        self.stdout.write("📄 Types de contrat...")
        data = [
            # (nom, h/semaine, congés/an, nuit autorisée)
            ("CDI Temps plein",   35, 25, True),
            ("CDI Mi-temps",      17, 25, False),
            ("CDD",               35, 20, True),
            ("Intérim",           35, 15, True),
            ("Stage",             35,  0, False),
        ]
        types = []
        for name, h, c, n in data:
            ct, _ = ContractType.objects.get_or_create(
                name=name,
                defaults=dict(
                    max_hours_per_week=h,
                    leave_days_per_year=c,
                    night_shift_allowed=n,
                )
            )
            types.append(ct)
        self.stdout.write(f"   → {len(types)} types")
        return types

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   F-03  CERTIFICATIONS
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    def seed_certifications(self):
        self.stdout.write("🏅 Certifications...")
        noms = [
            "BLS (Basic Life Support)",
            "ACLS (Advanced Cardiac Life Support)",
            "ATLS (Trauma Life Support)",
            "Habilitation soins intensifs",
            "Gestion des voies aériennes",
            "Perfusion IV",
            "Soins néonatals",
            "Radioprotection",
        ]
        certs = []
        for nom in noms:
            c, _ = Certification.objects.get_or_create(name=nom)
            certs.append(c)
        self.stdout.write(f"   → {len(certs)} certifications")
        return certs

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   F-06  TYPES D'ABSENCE
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    def seed_absence_types(self):
        self.stdout.write("🏖️  Types d'absence...")
        data = [
            ("Congés annuels",          False),
            ("Maladie",                 True),
            ("Formation",               False),
            ("Congé maternité",         False),
            ("Congé paternité",         False),
            ("Accident du travail",     True),
            ("Délégation syndicale",    False),
            ("Congé sans solde",        True),
        ]
        types = []
        for name, impacts in data:
            t, _ = AbsenceType.objects.get_or_create(
                name=name,
                defaults={"impacts_quota": impacts}
            )
            types.append(t)
        self.stdout.write(f"   → {len(types)} types")
        return types

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   F-05  TYPES DE SHIFT
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    def seed_shift_types(self):
        self.stdout.write("⏰ Types de shift...")
        data = [
            # (nom, durée_heures, repos_après)
            ("Jour",        8,  False),
            ("Après-midi", 8,  False),
            ("Nuit",       10, True),
            ("Week-end",   12, True),
            ("Garde 24h",  24, True),
        ]
        types = []
        for name, duration, rest in data:
            t, _ = ShiftType.objects.get_or_create(
                name=name,
                defaults={"duration_hours": duration, "requires_rest_after": rest}
            )
            types.append(t)
        self.stdout.write(f"   → {len(types)} types")
        return types

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   F-10  RÈGLES MÉTIER
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    def seed_rules(self):
        self.stdout.write("📏 Règles métier...")
        data = [
            ("Repos min après nuit",    "rest_time",  11, "hours"),
            ("Heures max par semaine",  "max_hours",  48, "hours"),
            ("Gardes max par mois",     "max_shifts", 10, "shifts"),
            ("Effectif min urgences",   "min_staff",   3, "persons"),
        ]
        rules = []
        for name, rtype, val, unit in data:
            r, _ = Rule.objects.get_or_create(
                name=name,
                defaults={
                    "rule_type":  rtype,
                    "value":      val,
                    "unit":       unit,
                    "valid_from": date(2024, 1, 1),
                    "valid_to":   None,
                }
            )
            rules.append(r)
        self.stdout.write(f"   → {len(rules)} règles")
        return rules

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   F-04  SERVICES
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    def seed_services(self):
        self.stdout.write("🏥 Services...")
        data = [
            ("Urgences",          120, 5),
            ("Chirurgie",          80, 4),
            ("Réanimation",        30, 5),
            ("Maternité",          60, 3),
            ("Pédiatrie",          50, 3),
            ("Cardiologie",        40, 4),
            ("Neurologie",         35, 4),
            ("Oncologie",          45, 3),
        ]
        services = []
        for name, beds, crit in data:
            s, _ = Service.objects.get_or_create(
                name=name,
                defaults={"bed_capacity": beds, "criticality_level": crit}
            )
            services.append(s)
        self.stdout.write(f"   → {len(services)} services")
        return services

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   F-04  UNITÉS DE SOINS
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    def seed_care_units(self, services):
        self.stdout.write("🚪 Unités de soins...")
        units_map = {
            "Urgences":    ["Tri", "Déchocage", "UHCD"],
            "Chirurgie":   ["Bloc A", "Bloc B", "Réveil"],
            "Réanimation": ["Réa adulte", "Réa néonatale"],
            "Maternité":   ["Salle de naissance", "Post-partum"],
            "Pédiatrie":   ["Pédiatrie générale", "Néonatologie"],
            "Cardiologie": ["Soins intensifs cardio", "Cardiologie générale"],
            "Neurologie":  ["Neurologie générale", "UNV"],
            "Oncologie":   ["Hôpital de jour", "Oncologie générale"],
        }
        units = []
        for service in services:
            for unit_name in units_map.get(service.name, ["Unité principale"]):
                u, _ = CareUnit.objects.get_or_create(
                    service=service, name=unit_name
                )
                units.append(u)
        self.stdout.write(f"   → {len(units)} unités")
        return units

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   F-01/02/03  STAFF (40 soignants)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    def seed_staff(self, roles, specialties, contract_types, certifications, services):
        self.stdout.write("👩‍⚕️ Soignants (40)...")
        staff_list = []

        for i in range(40):
            # ── Créer le soignant ──
            first = fake.first_name()
            last  = fake.last_name()
            email = f"{first.lower()}.{last.lower()}{i}@al-amal.ma"

            staff = Staff.objects.create(
                first_name = first,
                last_name  = last,
                email      = email,
                phone      = fake.phone_number(),
                is_active  = random.random() > 0.1,   # 90% actifs
            )

            # ── Rôles (1 à 2) ──
            for role in random.sample(roles, k=random.randint(1, 2)):
                StaffRole.objects.get_or_create(staff=staff, role=role)

            # ── Spécialités (1 à 3) ──
            for spec in random.sample(specialties, k=random.randint(1, 3)):
                StaffSpecialty.objects.get_or_create(staff=staff, specialty=spec)

            # ── Contrat ──
            ct         = random.choice(contract_types)
            start_date = fake.date_between(start_date="-5y", end_date="-6m")
            Contract.objects.create(
                staff            = staff,
                contract_type    = ct,
                start_date       = start_date,
                end_date         = None,
                workload_percent = random.choice([50, 75, 100]),
            )

            # ── Certifications (2 à 5) ──
            for cert in random.sample(certifications, k=random.randint(2, 5)):
                obtained   = fake.date_between(start_date="-4y", end_date="-1y")
                expiration = obtained + timedelta(days=random.choice([365, 730, 1095]))
                StaffCertification.objects.get_or_create(
                    staff         = staff,
                    certification = cert,
                    defaults={
                        "obtained_date":   obtained,
                        "expiration_date": expiration,
                    }
                )

            # ── Affectation principale ──
            service = random.choice(services)
            StaffServiceAssignment.objects.create(
                staff      = staff,
                service    = service,
                start_date = start_date,
                end_date   = None,
            )

            staff_list.append(staff)

        self.stdout.write(f"   → {len(staff_list)} soignants créés")
        return staff_list

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   F-05  SHIFTS (60 shifts sur 30 jours)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    def seed_shifts(self, care_units, shift_types, certifications):
        self.stdout.write("📅 Shifts (60 sur 30 jours)...")
        shifts = []
        today  = date.today()

        # Horaires selon type de shift
        hours_map = {
            "Jour":        (7, 0),
            "Après-midi":  (15, 0),
            "Nuit":        (21, 0),
            "Week-end":    (7, 0),
            "Garde 24h":   (8, 0),
        }

        for _ in range(60):
            unit       = random.choice(care_units)
            shift_type = random.choice(shift_types)
            day_offset = random.randint(-5, 25)   # passé récent + futur proche
            shift_date = today + timedelta(days=day_offset)

            start_h, start_m = hours_map.get(shift_type.name, (8, 0))
            start_dt = datetime(
                shift_date.year, shift_date.month, shift_date.day,
                start_h, start_m
            )
            end_dt = start_dt + timedelta(hours=shift_type.duration_hours)

            shift = Shift.objects.create(
                care_unit      = unit,
                shift_type     = shift_type,
                start_datetime = start_dt,
                end_datetime   = end_dt,
                min_staff      = random.randint(1, 3),
                max_staff      = random.randint(4, 8),
            )

            # Certifications requises (0 à 2)
            for cert in random.sample(certifications, k=random.randint(0, 2)):
                ShiftRequiredCertification.objects.get_or_create(
                    shift=shift, certification=cert
                )

            shifts.append(shift)

        self.stdout.write(f"   → {len(shifts)} shifts créés")
        return shifts

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   AFFECTATIONS (sans violer les contraintes)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    def seed_assignments(self, staff_list, shifts):
        self.stdout.write("🔗 Affectations...")
        count = 0

        for shift in shifts:
            # Nombre de soignants à affecter à ce shift
            nb = random.randint(shift.min_staff, min(shift.max_staff, shift.min_staff + 2))
            candidates = random.sample(staff_list, k=min(nb, len(staff_list)))

            for staff in candidates:
                # Vérification simplifiée : pas de doublon même shift
                already = ShiftAssignment.objects.filter(staff=staff, shift=shift).exists()
                if not already:
                    # Vérifier pas de chevauchement grossier
                    overlap = ShiftAssignment.objects.filter(
                        staff=staff,
                        shift__start_datetime__lt=shift.end_datetime,
                        shift__end_datetime__gt=shift.start_datetime,
                    ).exists()
                    if not overlap:
                        ShiftAssignment.objects.create(staff=staff, shift=shift)
                        count += 1

        self.stdout.write(f"   → {count} affectations créées")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   F-06  ABSENCES
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    def seed_absences(self, staff_list, absence_types):
        self.stdout.write("🏖️  Absences...")
        count = 0
        today = date.today()

        # 30% des soignants ont une absence
        for staff in random.sample(staff_list, k=len(staff_list) // 3):
            atype      = random.choice(absence_types)
            start      = fake.date_between(start_date="-30d", end_date="+10d")
            duration   = random.randint(1, 14)
            expected   = start + timedelta(days=duration)
            is_planned = atype.name in ["Congés annuels", "Formation",
                                         "Congé maternité", "Congé paternité"]

            Absence.objects.create(
                staff             = staff,
                absence_type      = atype,
                start_date        = start,
                expected_end_date = expected,
                actual_end_date   = None,
                is_planned        = is_planned,
            )
            count += 1

        self.stdout.write(f"   → {count} absences créées")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   F-08  CHARGE PATIENT
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    def seed_patient_loads(self, care_units):
        self.stdout.write("🛏️  Charge patient (30 jours)...")
        count = 0
        today = date.today()

        for unit in care_units:
            for day_offset in range(-15, 15):
                d     = today + timedelta(days=day_offset)
                count_p = random.randint(5, unit.service.bed_capacity)
                occupancy = round(count_p / unit.service.bed_capacity, 2)

                PatientLoad.objects.get_or_create(
                    care_unit = unit,
                    date      = d,
                    defaults  = {
                        "patient_count":  count_p,
                        "occupancy_rate": occupancy,
                    }
                )
                count += 1

        self.stdout.write(f"   → {count} entrées de charge patient")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #   RÉSUMÉ FINAL
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    def print_summary(self):
        self.stdout.write("\n📊 Résumé de la base de données :")
        self.stdout.write(f"   👔 Rôles            : {Role.objects.count()}")
        self.stdout.write(f"   🏷️  Spécialités      : {Specialty.objects.count()}")
        self.stdout.write(f"   📄 Types de contrat : {ContractType.objects.count()}")
        self.stdout.write(f"   🏅 Certifications   : {Certification.objects.count()}")
        self.stdout.write(f"   👩‍⚕️ Soignants        : {Staff.objects.count()}")
        self.stdout.write(f"   🏥 Services         : {Service.objects.count()}")
        self.stdout.write(f"   🚪 Unités de soins  : {CareUnit.objects.count()}")
        self.stdout.write(f"   📅 Shifts           : {Shift.objects.count()}")
        self.stdout.write(f"   🔗 Affectations     : {ShiftAssignment.objects.count()}")
        self.stdout.write(f"   🏖️  Absences         : {Absence.objects.count()}")
        self.stdout.write(f"   🛏️  Charges patient  : {PatientLoad.objects.count()}")
        self.stdout.write(f"   📏 Règles métier    : {Rule.objects.count()}")