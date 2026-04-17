from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    StaffViewSet,
    RoleViewSet,
    SpecialtyViewSet,
    ContractTypeViewSet,
    ContractViewSet,
    CertificationViewSet,
    StaffCertificationViewSet,
    PreferenceViewSet,
    StaffLoanViewSet
)

router = DefaultRouter()

router.register(r'staff', StaffViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'specialties', SpecialtyViewSet)
router.register(r'contract-types', ContractTypeViewSet)
router.register(r'contracts', ContractViewSet)
router.register(r'certifications', CertificationViewSet)
router.register(r'staff-certifications', StaffCertificationViewSet)
router.register(r'preferences', PreferenceViewSet)
router.register(r'staff-loans', StaffLoanViewSet)

urlpatterns = [
    path('', include(router.urls)),
]