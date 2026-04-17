from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ServiceViewSet,
    CareUnitViewSet,
    StaffServiceAssignmentViewSet,
    ServiceStatusViewSet
)

router = DefaultRouter()
router.register("services", ServiceViewSet)
router.register("care-units", CareUnitViewSet)
router.register("service-assignments", StaffServiceAssignmentViewSet)
router.register("service-status", ServiceStatusViewSet)

urlpatterns = [
    path("", include(router.urls)),
]