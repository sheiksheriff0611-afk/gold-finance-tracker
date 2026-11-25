from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    login_view, me_view, update_profile_view, change_password_view,
    EmployeeViewSet, coordinator_list_view, reassign_coordinator_view,
    coordinator_workload_view, employee_history_view,
    EmployeeTargetViewSet, dashboard_stats_view, cities_branches_view,
    setup_admin_view
)

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employees')
router.register(r'targets', EmployeeTargetViewSet, basename='targets')

urlpatterns = [
    path('login/', login_view, name='login'),
    path('setup-admin/', setup_admin_view, name='setup-admin'),
    path('me/', me_view, name='me'),
    path('profile/', update_profile_view, name='update-profile'),
    path('change-password/', change_password_view, name='change-password'),
    path('coordinators/', coordinator_list_view, name='coordinators'),
    path('reassign-coordinator/', reassign_coordinator_view, name='reassign-coordinator'),
    path('coordinator-workload/', coordinator_workload_view, name='coordinator-workload'),
    path('cities-branches/', cities_branches_view, name='cities-branches'),
    path('history/<int:employee_id>/', employee_history_view, name='employee-history'),
    path('dashboard-stats/', dashboard_stats_view, name='dashboard-stats'),
    path('', include(router.urls)),
]
