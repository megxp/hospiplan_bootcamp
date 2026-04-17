from rest_framework import serializers
from .models import ShiftType, Shift, ShiftAssignment


class ShiftTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftType
        fields = "__all__"


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = "__all__"


class ShiftAssignmentSerializer(serializers.ModelSerializer):
    shift_start = serializers.DateTimeField(source="shift.start_datetime", read_only=True)
    shift_end   = serializers.DateTimeField(source="shift.end_datetime", read_only=True)
    care_unit_id = serializers.IntegerField(source="shift.care_unit.id", read_only=True)

    shift_label = serializers.CharField(source="shift.shift_type.name", read_only=True)
    staff_name  = serializers.SerializerMethodField()

    # ✅ CORRECT PATHS
    service_name   = serializers.CharField(source="shift.care_unit.service.name", read_only=True)
    care_unit_name = serializers.CharField(source="shift.care_unit.name", read_only=True)
    shift_type_name = serializers.CharField(source="shift.shift_type.name", read_only=True)

    class Meta:
        model = ShiftAssignment
        fields = [
            "id",
            "shift",
            "staff",
            "assigned_at",
            "shift_start",
            "shift_end",
            "care_unit_id",
            "shift_label",
            "staff_name",
            "service_name",
            "care_unit_name",
            "shift_type_name",
        ]

    def get_staff_name(self, obj):
        return f"{obj.staff.first_name} {obj.staff.last_name}"