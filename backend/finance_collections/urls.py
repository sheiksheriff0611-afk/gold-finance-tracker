from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomerVisitViewSet, GoldCollectionViewSet, CashCollectionViewSet,
    approve_collection_view, reject_collection_view,
    reconcile_cash_view, approval_logs_view
)

router = DefaultRouter()
router.register(r'visits', CustomerVisitViewSet, basename='visits')
router.register(r'gold', GoldCollectionViewSet, basename='gold')
router.register(r'cash', CashCollectionViewSet, basename='cash')

urlpatterns = [
    path('approve/', approve_collection_view, name='approve-collection'),
    path('reject/', reject_collection_view, name='reject-collection'),
    path('reconcile-cash/', reconcile_cash_view, name='reconcile-cash'),
    path('logs/', approval_logs_view, name='approval-logs'),
    path('', include(router.urls)),
]

