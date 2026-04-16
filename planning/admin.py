from django.contrib import admin
from .models import (
    ShiftType, Shift, ShiftRequiredCertification, ShiftAssignment,
    AbsenceType, Absence,
    PatientLoad, Rule
)


# ── Inlines ────────────────────────────────────────────────────────

class ShiftRequiredCertInline(admin.TabularInline):
    model = ShiftRequiredCertification
    extra = 1

class ShiftAssignmentInline(admin.TabularInline):
    model = ShiftAssignment
    extra = 0
    readonly_fields = ('assigned_at',)


# ── Shifts ─────────────────────────────────────────────────────────

@admin.register(ShiftType)
class ShiftTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'duration_hours', 'requires_rest_after')


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display   = ('care_unit', 'shift_type', 'start_datetime', 'end_datetime', 'min_staff', 'max_staff')
    list_filter    = ('shift_type', 'care_unit__service')
    search_fields  = ('care_unit__name',)
    date_hierarchy = 'start_datetime'
    inlines        = [ShiftRequiredCertInline, ShiftAssignmentInline]


@admin.register(ShiftAssignment)
class ShiftAssignmentAdmin(admin.ModelAdmin):
    list_display  = ('staff', 'shift', 'assigned_at')
    search_fields = ('staff__last_name',)
    list_filter   = ('shift__shift_type',)


# ── Absences ───────────────────────────────────────────────────────

@admin.register(AbsenceType)
class AbsenceTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'impacts_quota')


@admin.register(Absence)
class AbsenceAdmin(admin.ModelAdmin):
    list_display   = ('staff', 'absence_type', 'start_date', 'expected_end_date', 'actual_end_date', 'is_planned')
    list_filter    = ('absence_type', 'is_planned')
    search_fields  = ('staff__last_name',)
    date_hierarchy = 'start_date'


# ── Charge patient ─────────────────────────────────────────────────

@admin.register(PatientLoad)
class PatientLoadAdmin(admin.ModelAdmin):
    list_display   = ('care_unit', 'date', 'patient_count', 'occupancy_rate')
    list_filter    = ('care_unit__service',)
    date_hierarchy = 'date'


# ── Règles métier ──────────────────────────────────────────────────

@admin.register(Rule)
class RuleAdmin(admin.ModelAdmin):
    list_display = ('name', 'rule_type', 'value', 'unit', 'valid_from', 'valid_to')
    list_filter  = ('rule_type',)
    search_fields = ('name',)