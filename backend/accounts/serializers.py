from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, EmployeeTarget


class UserSerializer(serializers.ModelSerializer):
    assigned_coordinator_name = serializers.SerializerMethodField()
    assigned_coordinator_code = serializers.CharField(source='assigned_coordinator.employee_id', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'role_display', 'employee_id', 'phone', 'emergency_contact',
            'pan_or_aadhaar', 'address', 'city', 'branch', 'joining_date', 'profile_photo',
            'assigned_coordinator', 'assigned_coordinator_name', 'assigned_coordinator_code',
            'status', 'status_display', 'is_working',
            'current_latitude', 'current_longitude', 'last_location_time',
            'gps_enabled', 'device_info', 'date_joined'
        ]
        read_only_fields = ['employee_id', 'is_working', 'current_latitude', 'current_longitude', 'last_location_time']

    def get_assigned_coordinator_name(self, obj):
        if obj.assigned_coordinator:
            return obj.assigned_coordinator.get_full_name() or obj.assigned_coordinator.username
        return None


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'password',
            'role', 'employee_id', 'phone', 'emergency_contact', 'pan_or_aadhaar',
            'address', 'city', 'branch', 'joining_date', 'profile_photo', 'assigned_coordinator', 'status'
        ]

    def validate(self, attrs):
        role = attrs.get('role', getattr(self.instance, 'role', 'SALES_EXECUTIVE'))
        if role in ['COORDINATOR', 'ADMIN']:
            attrs['assigned_coordinator'] = None
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_password('Gold@123')
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'email', 'phone',
            'emergency_contact', 'pan_or_aadhaar', 'address', 'city', 'branch', 'profile_photo'
        ]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class EmployeeTargetSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    period_display = serializers.CharField(source='get_period_display', read_only=True)

    class Meta:
        model = EmployeeTarget
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'period', 'period_display', 'start_date', 'end_date',
            'gold_target_grams', 'cash_target_amount',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.username

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return 'System'
