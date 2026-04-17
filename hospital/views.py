from rest_framework import viewsets
from .models import Service, CareUnit, StaffServiceAssignment, ServiceStatus
from .serializers import (
    ServiceSerializer,
    CareUnitSerializer,
    StaffServiceAssignmentSerializer,
    ServiceStatusSerializer
)


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer


class CareUnitViewSet(viewsets.ModelViewSet):
    queryset = CareUnit.objects.all()
    serializer_class = CareUnitSerializer


class StaffServiceAssignmentViewSet(viewsets.ModelViewSet):
    queryset = StaffServiceAssignment.objects.all()
    serializer_class = StaffServiceAssignmentSerializer


class ServiceStatusViewSet(viewsets.ModelViewSet):
    queryset = ServiceStatus.objects.all()
    serializer_class = ServiceStatusSerializer