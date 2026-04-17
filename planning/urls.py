from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShiftTypeViewSet, ShiftViewSet, ShiftAssignmentViewSet
from .views import generate_planning_view # Ajoute cette ligne si elle manque

router = DefaultRouter()
router.register("shift-types", ShiftTypeViewSet)
router.register("shifts", ShiftViewSet)
router.register("assignments", ShiftAssignmentViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path('plannings/generate/', generate_planning_view),
]