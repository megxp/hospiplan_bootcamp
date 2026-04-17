from rest_framework import viewsets
from .models import (
    Staff, Role, Specialty,
    ContractType, Contract,
    Certification, StaffCertification,
    Preference, StaffLoan
)

from .serializers import (
    StaffSerializer,
    RoleSerializer,
    SpecialtySerializer,
    ContractTypeSerializer,
    ContractSerializer,
    CertificationSerializer,
    StaffCertificationSerializer,
    PreferenceSerializer,
    StaffLoanSerializer
)

# ─────────────────────────────
# STAFF
# ─────────────────────────────

class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer


# ─────────────────────────────
# ROLE
# ─────────────────────────────

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer


# ─────────────────────────────
# SPECIALTY
# ─────────────────────────────

class SpecialtyViewSet(viewsets.ModelViewSet):
    queryset = Specialty.objects.all()
    serializer_class = SpecialtySerializer


# ─────────────────────────────
# CONTRACT TYPE
# ─────────────────────────────

class ContractTypeViewSet(viewsets.ModelViewSet):
    queryset = ContractType.objects.all()
    serializer_class = ContractTypeSerializer


# ─────────────────────────────
# CONTRACT
# ─────────────────────────────

class ContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.all()
    serializer_class = ContractSerializer


# ─────────────────────────────
# CERTIFICATION
# ─────────────────────────────

class CertificationViewSet(viewsets.ModelViewSet):
    queryset = Certification.objects.all()
    serializer_class = CertificationSerializer


class StaffCertificationViewSet(viewsets.ModelViewSet):
    queryset = StaffCertification.objects.all()
    serializer_class = StaffCertificationSerializer


# ─────────────────────────────
# PREFERENCES (F-07)
# ─────────────────────────────

class PreferenceViewSet(viewsets.ModelViewSet):
    queryset = Preference.objects.all()
    serializer_class = PreferenceSerializer


# ─────────────────────────────
# LOANS
# ─────────────────────────────

class StaffLoanViewSet(viewsets.ModelViewSet):
    queryset = StaffLoan.objects.all()
    serializer_class = StaffLoanSerializer