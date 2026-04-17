from rest_framework import serializers
from .models import (
    Staff, Role, StaffRole,
    Specialty, StaffSpecialty,
    ContractType, Contract,
    Certification, StaffCertification,
    Preference, StaffLoan
)

# ─────────────────────────────
# ROLE
# ─────────────────────────────

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'


# ─────────────────────────────
# SPECIALTY
# ─────────────────────────────

class SpecialtySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True)

    class Meta:
        model = Specialty
        fields = ['id', 'name', 'parent', 'parent_name']


# ─────────────────────────────
# STAFF SIMPLE (LIST + CREATE)
# ─────────────────────────────

class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = '__all__'


# ─────────────────────────────
# CONTRACT TYPE
# ─────────────────────────────

class ContractTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractType
        fields = '__all__'


# ─────────────────────────────
# CONTRACT
# ─────────────────────────────

class ContractSerializer(serializers.ModelSerializer):
    contract_type_name = serializers.CharField(source="contract_type.name", read_only=True)

    class Meta:
        model = Contract
        fields = '__all__'


# ─────────────────────────────
# CERTIFICATION
# ─────────────────────────────

class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = '__all__'


class StaffCertificationSerializer(serializers.ModelSerializer):
    certification_name = serializers.CharField(source="certification.name", read_only=True)

    class Meta:
        model = StaffCertification
        fields = '__all__'


# ─────────────────────────────
# PREFERENCES (F-07)
# ─────────────────────────────

class PreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Preference
        fields = '__all__'


# ─────────────────────────────
# LOANS (INTER-SERVICES)
# ─────────────────────────────

class StaffLoanSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffLoan
        fields = '__all__'