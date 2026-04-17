from rest_framework import viewsets
from rest_framework.response import Response  # ← manquant
from rest_framework import status   
from rest_framework.decorators import action
from .models import ShiftType, Shift, ShiftAssignment
from .serializers import (
    ShiftTypeSerializer,
    ShiftSerializer,
    ShiftAssignmentSerializer
)
from datetime import datetime
from .generator import generate_planning
from .constraints import validate_shift_assignment
from personnel.models import Staff

from rest_framework.decorators import api_view

@api_view(['POST'])
def generate_planning_view(request):
    try:
        period_start = datetime.fromisoformat(request.data["period_start"])
        period_end   = datetime.fromisoformat(request.data["period_end"])
    except (KeyError, ValueError):
        return Response(
            {"error": "Fournir period_start et period_end au format ISO (ex: 2026-04-17T00:00:00)"},
            status=status.HTTP_400_BAD_REQUEST
        )

    result = generate_planning(period_start, period_end)
    return Response(result, status=status.HTTP_201_CREATED)

class ShiftTypeViewSet(viewsets.ModelViewSet):
    queryset = ShiftType.objects.all()
    serializer_class = ShiftTypeSerializer


class ShiftAssignmentViewSet(viewsets.ModelViewSet):
    queryset = ShiftAssignment.objects.select_related(
        "staff",
        "shift",
        "shift__care_unit",
        "shift__care_unit__service",
        "shift__shift_type"
    ).all()

    def get_serializer_class(self):
        return ShiftAssignmentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        staff = serializer.validated_data["staff"]
        shift = serializer.validated_data["shift"]

        errors = validate_shift_assignment(staff, shift)

        if errors:
            return Response(
                {
                    "error": "Affectation refusée",
                    "details": errors
                },
                status=status.HTTP_409_CONFLICT
            )

        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class ShiftViewSet(viewsets.ModelViewSet):
    queryset = Shift.objects.select_related(
        "care_unit",
        "care_unit__service",
        "shift_type"
    ).prefetch_related(
        "required_certifications",
        "shiftrequiredcertification_set"
    ).all()
    serializer_class = ShiftSerializer

    @action(detail=True, methods=["get"])
    def eligible_staff(self, request, pk=None):
        shift = self.get_object()
        assigned_staff_ids = set(
            ShiftAssignment.objects.filter(shift=shift).values_list("staff_id", flat=True)
        )

        already_assigned = len(assigned_staff_ids)
        remaining_slots = max(shift.max_staff - already_assigned, 0)
        if remaining_slots == 0:
            return Response(
                {
                    "shift_id": shift.id,
                    "shift_full": True,
                    "remaining_slots": 0,
                    "eligible_staff": [],
                }
            )

        candidates = Staff.objects.filter(is_active=True).exclude(id__in=assigned_staff_ids)
        eligible_staff = []
        blocked_staff = []

        for staff in candidates:
            errors = validate_shift_assignment(staff, shift)
            if errors:
                blocked_staff.append(
                    {
                        "id": staff.id,
                        "full_name": f"{staff.first_name} {staff.last_name}",
                        "reasons": errors,
                    }
                )
                continue
            eligible_staff.append(
                {
                    "id": staff.id,
                    "first_name": staff.first_name,
                    "last_name": staff.last_name,
                    "full_name": f"{staff.first_name} {staff.last_name}",
                }
            )

        return Response(
            {
                "shift_id": shift.id,
                "shift_full": False,
                "remaining_slots": remaining_slots,
                "eligible_staff": eligible_staff,
                "blocked_staff": blocked_staff,
            }
        )