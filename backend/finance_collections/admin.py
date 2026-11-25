from django.contrib import admin
from .models import CustomerVisit, GoldCollection, CashCollection, CollectionApprovalLog


@admin.register(CustomerVisit)
class CustomerVisitAdmin(admin.ModelAdmin):
    list_display = ('customer_name', 'customer_mobile', 'employee', 'visit_purpose', 'visit_status', 'visit_datetime')
    list_filter = ('visit_purpose', 'visit_status', 'visit_datetime')
    search_fields = ('customer_name', 'customer_mobile', 'employee__employee_id')


@admin.register(GoldCollection)
class GoldCollectionAdmin(admin.ModelAdmin):
    list_display = ('receipt_number', 'customer_name', 'employee', 'jewellery_type', 'gold_weight_grams', 'gold_purity', 'approval_status')
    list_filter = ('approval_status', 'jewellery_type', 'gold_purity', 'collection_datetime')
    search_fields = ('receipt_number', 'customer_name', 'customer_mobile', 'employee__employee_id')


@admin.register(CashCollection)
class CashCollectionAdmin(admin.ModelAdmin):
    list_display = ('receipt_number', 'customer_name', 'employee', 'cash_amount', 'payment_method', 'approval_status', 'deposit_status')
    list_filter = ('approval_status', 'deposit_status', 'payment_method', 'collection_datetime')
    search_fields = ('receipt_number', 'customer_name', 'customer_mobile', 'employee__employee_id')


@admin.register(CollectionApprovalLog)
class CollectionApprovalLogAdmin(admin.ModelAdmin):
    list_display = ('collection_type', 'action', 'actor', 'previous_status', 'new_status', 'timestamp')
    list_filter = ('collection_type', 'action', 'timestamp')
