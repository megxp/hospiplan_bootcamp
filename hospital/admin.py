from django.contrib import admin
from .models import Service, CareUnit, ServiceStatus, StaffServiceAssignment


class CareUnitInline(admin.TabularInline):
    model = CareUnit
    extra = 1

class ServiceStatusInline(admin.TabularInline):
    model = ServiceStatus
    extra = 0


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display  = ('name', 'manager', 'bed_capacity', 'criticality_level')
    list_filter   = ('criticality_level',)
    search_fields = ('name',)
    inlines       = [CareUnitInline, ServiceStatusInline]


@admin.register(CareUnit)
class CareUnitAdmin(admin.ModelAdmin):
    list_display  = ('name', 'service')
    list_filter   = ('service',)
    search_fields = ('name',)


@admin.register(StaffServiceAssignment)
class StaffServiceAssignmentAdmin(admin.ModelAdmin):
    list_display  = ('staff', 'service', 'start_date', 'end_date')
    list_filter   = ('service',)
    search_fields = ('staff__last_name',)
    date_hierarchy = 'start_date'