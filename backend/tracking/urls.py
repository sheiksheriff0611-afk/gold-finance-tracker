from django.urls import path
from .views import (
    toggle_work_shift, ping_location,
    live_locations_view, employee_breadcrumbs_view,
    active_shift_details_view, shift_history_view
)

urlpatterns = [
    path('toggle-work/', toggle_work_shift, name='toggle-work'),
    path('active-shift/', active_shift_details_view, name='active-shift'),
    path('shifts/', shift_history_view, name='shift-history'),
    path('ping/', ping_location, name='ping-location'),
    path('live-locations/', live_locations_view, name='live-locations'),
    path('breadcrumbs/<int:employee_id>/', employee_breadcrumbs_view, name='employee-breadcrumbs'),
]
