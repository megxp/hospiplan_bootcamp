from django.contrib import admin
from .models import (
    Staff, Role, StaffRole,
    Specialty, StaffSpecialty,
    ContractType, Contract,
    Certification, CertificationDependency, StaffCertification,
    Preference, StaffLoan
)


# ── Inlines (sous-tableaux imbriqués) ──────────────────────────────

class StaffRoleInline(admin.TabularInline):
    model = StaffRole
    extra = 1

class StaffSpecialtyInline(admin.TabularInline):
    model = StaffSpecialty
    extra = 1

class ContractInline(admin.TabularInline):
    model = Contract
    extra = 0
    readonly_fields = ('start_date', 'end_date', 'workload_percent')

class StaffCertificationInline(admin.TabularInline):
    model = StaffCertification
    extra = 1


# ── Staff ──────────────────────────────────────────────────────────

@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display  = ('last_name', 'first_name', 'email', 'phone', 'is_active', 'created_at')
    list_filter   = ('is_active',)
    search_fields = ('last_name', 'first_name', 'email')
    ordering      = ('last_name',)
    inlines       = [StaffRoleInline, StaffSpecialtyInline, ContractInline, StaffCertificationInline]

    fieldsets = (
        ('🧑 Identité', {
            'fields': ('first_name', 'last_name', 'email', 'phone')
        }),
        ('⚙️ Statut', {
            'fields': ('is_active',)
        }),
    )


# ── Rôles & Spécialités ────────────────────────────────────────────

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display  = ('id', 'name')
    search_fields = ('name',)


@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display  = ('id', 'name', 'parent')
    list_filter   = ('parent',)
    search_fields = ('name',)


# ── Contrats ───────────────────────────────────────────────────────

@admin.register(ContractType)
class ContractTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'max_hours_per_week', 'leave_days_per_year', 'night_shift_allowed')


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display  = ('staff', 'contract_type', 'start_date', 'end_date', 'workload_percent')
    list_filter   = ('contract_type',)
    search_fields = ('staff__last_name', 'staff__first_name')
    date_hierarchy = 'start_date'


# ── Certifications ─────────────────────────────────────────────────

@admin.register(Certification)
class CertificationAdmin(admin.ModelAdmin):
    list_display  = ('id', 'name')
    search_fields = ('name',)


@admin.register(StaffCertification)
class StaffCertificationAdmin(admin.ModelAdmin):
    list_display  = ('staff', 'certification', 'obtained_date', 'expiration_date')
    list_filter   = ('certification',)
    search_fields = ('staff__last_name',)


# ── Préférences ────────────────────────────────────────────────────

@admin.register(Preference)
class PreferenceAdmin(admin.ModelAdmin):
    list_display  = ('staff', 'type', 'is_hard_constraint', 'start_date', 'end_date')
    list_filter   = ('type', 'is_hard_constraint')
    search_fields = ('staff__last_name',)


# ── Prêts inter-services ───────────────────────────────────────────

@admin.register(StaffLoan)
class StaffLoanAdmin(admin.ModelAdmin):
    list_display  = ('staff', 'from_service', 'to_service', 'start_date', 'end_date')
    search_fields = ('staff__last_name',)