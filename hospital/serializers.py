from rest_framework import serializers
from .models import Service, CareUnit, StaffServiceAssignment, ServiceStatus


class CareUnitSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model = CareUnit
        fields = "__all__"


class ServiceSerializer(serializers.ModelSerializer):
    care_units = CareUnitSerializer(many=True, read_only=True)

    class Meta:
        model = Service
        fields = "__all__"


class StaffServiceAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffServiceAssignment
        fields = "__all__"


class ServiceStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceStatus
        fields = "__all__"