from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, EmployeeTarget


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'employee_id', 'role', 'phone', 'status', 'is_working', 'assigned_coordinator')
    list_filter = ('role', 'status', 'is_working')
    fieldsets = UserAdmin.fieldsets + (
        ('Employee Information', {
            'fields': (
                'role', 'employee_id', 'phone', 'address', 'joining_date',
                'assigned_coordinator', 'status', 'is_working',
                'current_latitude', 'current_longitude', 'last_location_time',
                'gps_enabled', 'device_info'
            )
        }),
    )


@admin.register(EmployeeTarget)
class EmployeeTargetAdmin(admin.ModelAdmin):
    list_display = ('employee', 'period', 'start_date', 'end_date', 'gold_target_grams', 'cash_target_amount')
    list_filter = ('period', 'start_date')
    search_fields = ('employee__username', 'employee__employee_id')
