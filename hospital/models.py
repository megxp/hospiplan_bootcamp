from django.db import models


class Service(models.Model):
    name             = models.CharField(max_length=200)
    manager          = models.ForeignKey(
        'personnel.Staff',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='managed_services'
    )
    bed_capacity      = models.IntegerField(default=0)
    criticality_level = models.IntegerField(default=1)  # 1 = faible, 5 = critique

    def __str__(self):
        return self.name


class CareUnit(models.Model):
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='care_units')
    name    = models.CharField(max_length=200)

    def __str__(self):
        return f"{self.service} / {self.name}"


class ServiceStatus(models.Model):
    STATUS_CHOICES = [
        ('ouvert',        'Ouvert'),
        ('ferme',         'Fermé'),
        ('sous-effectif', 'Sous-effectif'),
    ]

    service    = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='statuses')
    status     = models.CharField(max_length=30, choices=STATUS_CHOICES)
    start_date = models.DateField()
    end_date   = models.DateField(null=True, blank=True)


class StaffServiceAssignment(models.Model):
    """Historique d'affectation principale d'un soignant à un service."""
    staff      = models.ForeignKey('personnel.Staff', on_delete=models.CASCADE)
    service    = models.ForeignKey(Service,           on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date   = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-start_date']