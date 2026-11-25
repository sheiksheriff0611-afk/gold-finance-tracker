from rest_framework import serializers
from .models import WorkShift, LocationPing
from accounts.serializers import UserSerializer


class LocationPingSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)

    class Meta:
        model = LocationPing
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'latitude', 'longitude', 'accuracy',
            'activity_type', 'activity_type_display',
            'battery_level', 'address_snapshot', 'timestamp'
        ]

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.username


class WorkShiftSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    pings = LocationPingSerializer(many=True, read_only=True)

    class Meta:
        model = WorkShift
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'start_time', 'end_time', 'start_latitude', 'start_longitude',
            'end_latitude', 'end_longitude', 'is_active', 'notes', 'pings'
        ]

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.username

