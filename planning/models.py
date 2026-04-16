from django.db import models


# ─────────────────────────────────────────────
# F-05  Gardes & Créneaux
# ─────────────────────────────────────────────

class ShiftType(models.Model):
    name                = models.CharField(max_length=100)  # jour, nuit, week-end
    duration_hours      = models.IntegerField()
    requires_rest_after = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class Shift(models.Model):
    care_unit      = models.ForeignKey('hospital.CareUnit', on_delete=models.CASCADE, related_name='shifts')
    shift_type     = models.ForeignKey(ShiftType,           on_delete=models.PROTECT)
    start_datetime = models.DateTimeField()
    end_datetime   = models.DateTimeField()
    min_staff      = models.IntegerField(default=1)
    max_staff      = models.IntegerField(default=5)

    # Certifications requises (M2M)
    required_certifications = models.ManyToManyField(
        'personnel.Certification',
        through='ShiftRequiredCertification',
        blank=True
    )

    def __str__(self):
        return f"{self.care_unit} | {self.shift_type} | {self.start_datetime:%Y-%m-%d %H:%M}"


class ShiftRequiredCertification(models.Model):
    shift         = models.ForeignKey(Shift,                  on_delete=models.CASCADE)
    certification = models.ForeignKey('personnel.Certification', on_delete=models.CASCADE)

    class Meta:
        unique_together = ('shift', 'certification')


class ShiftAssignment(models.Model):
    """Affectation réelle d'un soignant à un shift."""
    shift       = models.ForeignKey(Shift,             on_delete=models.CASCADE, related_name='assignments')
    staff       = models.ForeignKey('personnel.Staff', on_delete=models.CASCADE, related_name='shift_assignments')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('shift', 'staff')


# ─────────────────────────────────────────────
# F-06  Absences
# ─────────────────────────────────────────────

class AbsenceType(models.Model):
    name           = models.CharField(max_length=100)
    impacts_quota  = models.BooleanField(default=False)  # impacte le quota de gardes ?

    def __str__(self):
        return self.name


class Absence(models.Model):
    staff               = models.ForeignKey('personnel.Staff', on_delete=models.CASCADE, related_name='absences')
    absence_type        = models.ForeignKey(AbsenceType,       on_delete=models.PROTECT)
    start_date          = models.DateField()
    expected_end_date   = models.DateField()
    actual_end_date     = models.DateField(null=True, blank=True)
    is_planned          = models.BooleanField(default=True)  # False = maladie imprévue

    def __str__(self):
        return f"{self.staff} — {self.absence_type} ({self.start_date})"


# ─────────────────────────────────────────────
# F-08  Charge patient
# ─────────────────────────────────────────────

class PatientLoad(models.Model):
    care_unit      = models.ForeignKey('hospital.CareUnit', on_delete=models.CASCADE, related_name='patient_loads')
    date           = models.DateField()
    patient_count  = models.IntegerField()
    occupancy_rate = models.FloatField()  # 0.0 → 1.0

    class Meta:
        unique_together = ('care_unit', 'date')


# ─────────────────────────────────────────────
# F-10  Règles métier configurables
# ─────────────────────────────────────────────

class Rule(models.Model):
    RULE_TYPE_CHOICES = [
        ('max_hours',  'Heures max'),
        ('rest_time',  'Temps de repos'),
        ('min_staff',  'Effectif minimum'),
        ('max_shifts', 'Gardes maximum'),
    ]

    name        = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    rule_type   = models.CharField(max_length=50, choices=RULE_TYPE_CHOICES)
    value       = models.DecimalField(max_digits=10, decimal_places=2)
    unit        = models.CharField(max_length=20)  # hours, days...
    valid_from  = models.DateField()
    valid_to    = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.value} {self.unit})"