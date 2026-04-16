from django.db import models


# ─────────────────────────────────────────────
# F-01  Personnel & Profils
# ─────────────────────────────────────────────

class Role(models.Model):
    name = models.CharField(max_length=100)  # médecin, infirmier...

    def __str__(self):
        return self.name


class Specialty(models.Model):
    name      = models.CharField(max_length=100)
    parent    = models.ForeignKey(
        'self',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='children'
    )

    def __str__(self):
        return self.name


class Staff(models.Model):
    first_name  = models.CharField(max_length=100)
    last_name   = models.CharField(max_length=100)
    email       = models.EmailField(unique=True)
    phone       = models.CharField(max_length=20, blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    # M2M via tables de liaison explicites
    roles       = models.ManyToManyField(Role,      through='StaffRole')
    specialties = models.ManyToManyField(Specialty, through='StaffSpecialty')

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class StaffRole(models.Model):
    staff = models.ForeignKey(Staff,   on_delete=models.CASCADE)
    role  = models.ForeignKey(Role,    on_delete=models.CASCADE)

    class Meta:
        unique_together = ('staff', 'role')


class StaffSpecialty(models.Model):
    staff     = models.ForeignKey(Staff,     on_delete=models.CASCADE)
    specialty = models.ForeignKey(Specialty, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('staff', 'specialty')


# ─────────────────────────────────────────────
# F-02  Contrats
# ─────────────────────────────────────────────

class ContractType(models.Model):
    name                 = models.CharField(max_length=100)  # CDI, CDD...
    max_hours_per_week   = models.IntegerField()
    leave_days_per_year  = models.IntegerField()
    night_shift_allowed  = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Contract(models.Model):
    staff             = models.ForeignKey(Staff,        on_delete=models.CASCADE, related_name='contracts')
    contract_type     = models.ForeignKey(ContractType, on_delete=models.PROTECT)
    start_date        = models.DateField()
    end_date          = models.DateField(null=True, blank=True)
    workload_percent  = models.IntegerField(default=100)  # 100 = temps plein

    def __str__(self):
        return f"{self.staff} — {self.contract_type} ({self.start_date})"


# ─────────────────────────────────────────────
# F-03  Certifications
# ─────────────────────────────────────────────

class Certification(models.Model):
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name


class CertificationDependency(models.Model):
    """Une certification peut en requérir d'autres (prérequis)."""
    parent_cert   = models.ForeignKey(
        Certification, on_delete=models.CASCADE, related_name='dependencies'
    )
    required_cert = models.ForeignKey(
        Certification, on_delete=models.CASCADE, related_name='required_by'
    )

    class Meta:
        unique_together = ('parent_cert', 'required_cert')


class StaffCertification(models.Model):
    staff           = models.ForeignKey(Staff,         on_delete=models.CASCADE)
    certification   = models.ForeignKey(Certification, on_delete=models.CASCADE)
    obtained_date   = models.DateField()
    expiration_date = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ('staff', 'certification')


# ─────────────────────────────────────────────
# F-07  Préférences & Contraintes
# ─────────────────────────────────────────────

class Preference(models.Model):
    TYPE_CHOICES = [
        ('preference',  'Préférence'),
        ('contrainte',  'Contrainte'),
    ]

    staff               = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='preferences')
    type                = models.CharField(max_length=20, choices=TYPE_CHOICES)
    description         = models.TextField()
    is_hard_constraint  = models.BooleanField(default=False)
    start_date          = models.DateField(null=True, blank=True)
    end_date            = models.DateField(null=True, blank=True)


# ─────────────────────────────────────────────
# F-09  Prêts inter-services (déclaré ici,
#        FK vers hospital.Service résolue plus bas)
# ─────────────────────────────────────────────

class StaffLoan(models.Model):
    staff          = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='loans')
    from_service   = models.ForeignKey('hospital.Service', on_delete=models.PROTECT, related_name='loans_out')
    to_service     = models.ForeignKey('hospital.Service', on_delete=models.PROTECT, related_name='loans_in')
    start_date     = models.DateField()
    end_date       = models.DateField()

    def __str__(self):
        return f"{self.staff} : {self.from_service} → {self.to_service}"