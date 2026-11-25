from rest_framework import serializers
from .models import CustomerVisit, GoldCollection, CashCollection, CollectionApprovalLog


class CustomerVisitSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    visit_purpose_display = serializers.CharField(source='get_visit_purpose_display', read_only=True)
    visit_status_display = serializers.CharField(source='get_visit_status_display', read_only=True)

    class Meta:
        model = CustomerVisit
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'customer_name', 'customer_mobile', 'customer_address',
            'visit_datetime', 'latitude', 'longitude',
            'visit_purpose', 'visit_purpose_display',
            'visit_status', 'visit_status_display',
            'remarks', 'created_at', 'updated_at'
        ]
        read_only_fields = ['employee', 'created_at', 'updated_at']

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.username

    def validate_customer_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Customer name is required.")
        return str(value).strip()

    def validate_customer_mobile(self, value):
        cleaned = ''.join(c for c in str(value) if c.isdigit())
        if len(cleaned) < 10:
            raise serializers.ValidationError("Customer mobile number must contain at least 10 digits.")
        return str(value).strip()

    def validate_latitude(self, value):
        if value is not None and not (-90.0 <= value <= 90.0):
            raise serializers.ValidationError("Latitude must be between -90 and 90 degrees.")
        return value

    def validate_longitude(self, value):
        if value is not None and not (-180.0 <= value <= 180.0):
            raise serializers.ValidationError("Longitude must be between -180 and 180 degrees.")
        return value


class GoldCollectionSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    jewellery_type_display = serializers.CharField(source='get_jewellery_type_display', read_only=True)
    gold_purity_display = serializers.CharField(source='get_gold_purity_display', read_only=True)
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    verified_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GoldCollection
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'customer_name', 'customer_mobile', 'customer_address',
            'jewellery_type', 'jewellery_type_display', 'jewellery_description',
            'gold_weight_grams', 'gold_purity', 'gold_purity_display',
            'estimated_value', 'collection_datetime', 'receipt_number',
            'latitude', 'longitude', 'jewellery_photo', 'receipt_photo', 'remarks',
            'approval_status', 'approval_status_display',
            'verified_by_coordinator', 'verified_by_name', 'verified_at',
            'approved_by_admin', 'approved_by_name', 'approved_at',
            'rejection_remarks', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'employee', 'approval_status', 'verified_by_coordinator',
            'verified_at', 'approved_by_admin', 'approved_at',
            'rejection_remarks', 'created_at', 'updated_at'
        ]

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.username

    def get_verified_by_name(self, obj):
        if obj.verified_by_coordinator:
            return obj.verified_by_coordinator.get_full_name() or obj.verified_by_coordinator.username
        return None

    def get_approved_by_name(self, obj):
        if obj.approved_by_admin:
            return obj.approved_by_admin.get_full_name() or obj.approved_by_admin.username
        return None

    def validate_receipt_number(self, value):
        # Check uniqueness, excluding current instance during update
        qs = GoldCollection.objects.filter(receipt_number=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError(f"Receipt number '{value}' already exists. Duplicate receipts are prohibited.")
        return value

    def validate_gold_weight_grams(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Gold net weight must be greater than 0 grams.")
        if value > 50000:
            raise serializers.ValidationError("Gold net weight exceeds maximum allowable single submission (50 kg).")
        return value

    def validate_customer_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Customer name is required.")
        return str(value).strip()

    def validate_customer_mobile(self, value):
        cleaned = ''.join(c for c in str(value) if c.isdigit())
        if len(cleaned) < 10:
            raise serializers.ValidationError("Customer mobile number must contain at least 10 digits.")
        return str(value).strip()

    def validate_latitude(self, value):
        if value is not None and not (-90.0 <= value <= 90.0):
            raise serializers.ValidationError("Latitude must be between -90 and 90 degrees.")
        return value

    def validate_longitude(self, value):
        if value is not None and not (-180.0 <= value <= 180.0):
            raise serializers.ValidationError("Longitude must be between -180 and 180 degrees.")
        return value


class CashCollectionSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    deposit_status_display = serializers.CharField(source='get_deposit_status_display', read_only=True)
    verified_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    reconciled_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CashCollection
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'customer_name', 'customer_mobile', 'customer_address',
            'cash_amount', 'receipt_number', 'collection_datetime',
            'latitude', 'longitude', 'payment_method', 'payment_method_display',
            'receipt_photo', 'remarks',
            'approval_status', 'approval_status_display',
            'verified_by_coordinator', 'verified_by_name', 'verified_at',
            'approved_by_admin', 'approved_by_name', 'approved_at',
            'rejection_remarks',
            'deposit_status', 'deposit_status_display', 'deposit_date',
            'bank_reference', 'reconciliation_remarks',
            'reconciled_by', 'reconciled_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'employee', 'approval_status', 'verified_by_coordinator',
            'verified_at', 'approved_by_admin', 'approved_at',
            'rejection_remarks', 'reconciled_by', 'created_at', 'updated_at'
        ]

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.username

    def get_verified_by_name(self, obj):
        if obj.verified_by_coordinator:
            return obj.verified_by_coordinator.get_full_name() or obj.verified_by_coordinator.username
        return None

    def get_approved_by_name(self, obj):
        if obj.approved_by_admin:
            return obj.approved_by_admin.get_full_name() or obj.approved_by_admin.username
        return None

    def get_reconciled_by_name(self, obj):
        if obj.reconciled_by:
            return obj.reconciled_by.get_full_name() or obj.reconciled_by.username
        return None

    def validate_receipt_number(self, value):
        qs = CashCollection.objects.filter(receipt_number=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError(f"Receipt number '{value}' already exists. Duplicate receipts are prohibited.")
        return value

    def validate_cash_amount(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Cash amount must be greater than ₹0.")
        return value

    def validate_customer_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Customer name is required.")
        return str(value).strip()

    def validate_customer_mobile(self, value):
        cleaned = ''.join(c for c in str(value) if c.isdigit())
        if len(cleaned) < 10:
            raise serializers.ValidationError("Customer mobile number must contain at least 10 digits.")
        return str(value).strip()

    def validate_latitude(self, value):
        if value is not None and not (-90.0 <= value <= 90.0):
            raise serializers.ValidationError("Latitude must be between -90 and 90 degrees.")
        return value

    def validate_longitude(self, value):
        if value is not None and not (-180.0 <= value <= 180.0):
            raise serializers.ValidationError("Longitude must be between -180 and 180 degrees.")
        return value


class CollectionApprovalLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    actor_role = serializers.CharField(source='actor.role', read_only=True)
    receipt_number = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = CollectionApprovalLog
        fields = [
            'id', 'collection_type', 'gold_collection', 'cash_collection',
            'receipt_number', 'customer_name',
            'action', 'actor', 'actor_name', 'actor_role', 'previous_status', 'new_status',
            'remarks', 'timestamp'
        ]

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name() or obj.actor.username
        return 'System'

    def get_receipt_number(self, obj):
        if obj.gold_collection:
            return obj.gold_collection.receipt_number
        if obj.cash_collection:
            return obj.cash_collection.receipt_number
        return '—'

    def get_customer_name(self, obj):
        if obj.gold_collection:
            return obj.gold_collection.customer_name
        if obj.cash_collection:
            return obj.cash_collection.customer_name
        return '—'

