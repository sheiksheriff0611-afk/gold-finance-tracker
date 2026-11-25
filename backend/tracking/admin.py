from django.contrib import admin
from .models import WorkShift, LocationPing


@admin.register(WorkShift)
class WorkShiftAdmin(admin.ModelAdmin):
    list_display = ('employee', 'start_time', 'end_time', 'is_active')
    list_filter = ('is_active', 'start_time')
    search_fields = ('employee__username', 'employee__employee_id')


@admin.register(LocationPing)
class LocationPingAdmin(admin.ModelAdmin):
    list_display = ('employee', 'latitude', 'longitude', 'activity_type', 'timestamp', 'battery_level')
    list_filter = ('activity_type', 'timestamp')
    search_fields = ('employee__username', 'employee__employee_id')
