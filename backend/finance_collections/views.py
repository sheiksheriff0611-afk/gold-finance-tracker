from decimal import Decimal
from django.utils import timezone
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import CustomerVisit, GoldCollection, CashCollection, CollectionApprovalLog
from .serializers import (
    CustomerVisitSerializer, GoldCollectionSerializer,
    CashCollectionSerializer, CollectionApprovalLogSerializer
)
from tracking.models import LocationPing, WorkShift
from accounts.permissions import IsAdmin, IsCoordinatorOrAdmin


def get_estimated_gold_value(weight_grams, purity):
    # Standard benchmark rates per gram in INR
    rates = {
        '24K': Decimal('7850.00'),
        '22K': Decimal('7200.00'),
        '20K': Decimal('6550.00'),
        '18K': Decimal('5890.00'),
    }
    rate = rates.get(purity, Decimal('7200.00'))
    return Decimal(weight_grams) * rate


class CustomerVisitViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerVisitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = CustomerVisit.objects.all().select_related('employee')

        if user.role == 'ADMIN' or user.is_superuser:
            pass
        elif user.role == 'COORDINATOR':
            qs = qs.filter(Q(employee__assigned_coordinator=user) | Q(employee=user))
        else:
            qs = qs.filter(employee=user)

        # Filters
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(visit_status=status_filter)

        purpose_filter = self.request.query_params.get('purpose')
        if purpose_filter:
            qs = qs.filter(visit_purpose=purpose_filter)

        emp_filter = self.request.query_params.get('employee')
        if emp_filter and (user.role in ['ADMIN', 'COORDINATOR'] or user.is_superuser):
            qs = qs.filter(employee_id=emp_filter)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(customer_name__icontains=search) |
                Q(customer_mobile__icontains=search) |
                Q(customer_address__icontains=search)
            )

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        visit = serializer.save(employee=user)

        # Record GPS location ping if provided
        if visit.latitude and visit.longitude:
            active_shift = WorkShift.objects.filter(employee=user, is_active=True).first()
            LocationPing.objects.create(
                employee=user,
                shift=active_shift,
                latitude=visit.latitude,
                longitude=visit.longitude,
                activity_type='CUSTOMER_VISIT',
                address_snapshot=f"Visit: {visit.customer_name} ({visit.get_visit_purpose_display()})"
            )


class GoldCollectionViewSet(viewsets.ModelViewSet):
    serializer_class = GoldCollectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = GoldCollection.objects.all().select_related('employee', 'verified_by_coordinator', 'approved_by_admin')

        if user.role == 'ADMIN' or user.is_superuser:
            pass
        elif user.role == 'COORDINATOR':
            qs = qs.filter(Q(employee__assigned_coordinator=user) | Q(employee=user))
        else:
            qs = qs.filter(employee=user)

        approval_filter = self.request.query_params.get('status')
        if approval_filter:
            qs = qs.filter(approval_status=approval_filter)

        purity_filter = self.request.query_params.get('purity')
        if purity_filter:
            qs = qs.filter(gold_purity=purity_filter)

        jewellery_filter = self.request.query_params.get('jewellery_type')
        if jewellery_filter:
            qs = qs.filter(jewellery_type=jewellery_filter)

        emp_filter = self.request.query_params.get('employee')
        if emp_filter and (user.role in ['ADMIN', 'COORDINATOR'] or user.is_superuser):
            qs = qs.filter(employee_id=emp_filter)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(customer_name__icontains=search) |
                Q(customer_mobile__icontains=search) |
                Q(receipt_number__icontains=search)
            )

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        weight = serializer.validated_data.get('gold_weight_grams', Decimal('0'))
        purity = serializer.validated_data.get('gold_purity', '22K')
        est_val = serializer.validated_data.get('estimated_value', Decimal('0'))

        # Auto-calculate estimated value if zero
        if not est_val or est_val <= 0:
            est_val = get_estimated_gold_value(weight, purity)

        gold = serializer.save(employee=user, estimated_value=est_val, approval_status='PENDING')

        # Log creation
        CollectionApprovalLog.objects.create(
            collection_type='GOLD',
            gold_collection=gold,
            action='SUBMITTED',
            actor=user,
            previous_status='DRAFT',
            new_status='PENDING',
            remarks=f"Submitted {gold.gold_weight_grams}g of {gold.get_jewellery_type_display()}."
        )

        # Log GPS ping
        if gold.latitude and gold.longitude:
            active_shift = WorkShift.objects.filter(employee=user, is_active=True).first()
            LocationPing.objects.create(
                employee=user,
                shift=active_shift,
                latitude=gold.latitude,
                longitude=gold.longitude,
                activity_type='GOLD_COLLECTION',
                address_snapshot=f"Gold: {gold.receipt_number} - {gold.customer_name}"
            )

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.approval_status in ['APPROVED', 'VERIFIED']:
            raise ValidationError("Verified or Approved collection records are locked and cannot be edited.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.approval_status in ['APPROVED', 'VERIFIED']:
            raise ValidationError("Verified or Approved collection records are locked and cannot be deleted.")
        instance.delete()


class CashCollectionViewSet(viewsets.ModelViewSet):
    serializer_class = CashCollectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = CashCollection.objects.all().select_related('employee', 'verified_by_coordinator', 'approved_by_admin', 'reconciled_by')

        if user.role == 'ADMIN' or user.is_superuser:
            pass
        elif user.role == 'COORDINATOR':
            qs = qs.filter(Q(employee__assigned_coordinator=user) | Q(employee=user))
        else:
            qs = qs.filter(employee=user)

        approval_filter = self.request.query_params.get('status')
        if approval_filter:
            qs = qs.filter(approval_status=approval_filter)

        deposit_filter = self.request.query_params.get('deposit_status')
        if deposit_filter:
            qs = qs.filter(deposit_status=deposit_filter)

        payment_filter = self.request.query_params.get('payment_method')
        if payment_filter:
            qs = qs.filter(payment_method=payment_filter)

        emp_filter = self.request.query_params.get('employee')
        if emp_filter and (user.role in ['ADMIN', 'COORDINATOR'] or user.is_superuser):
            qs = qs.filter(employee_id=emp_filter)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(customer_name__icontains=search) |
                Q(customer_mobile__icontains=search) |
                Q(receipt_number__icontains=search)
            )

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        cash = serializer.save(employee=user, approval_status='PENDING', deposit_status='IN_HAND')

        # Log creation
        CollectionApprovalLog.objects.create(
            collection_type='CASH',
            cash_collection=cash,
            action='SUBMITTED',
            actor=user,
            previous_status='DRAFT',
            new_status='PENDING',
            remarks=f"Submitted ₹{cash.cash_amount} via {cash.get_payment_method_display()}."
        )

        # Log GPS ping
        if cash.latitude and cash.longitude:
            active_shift = WorkShift.objects.filter(employee=user, is_active=True).first()
            LocationPing.objects.create(
                employee=user,
                shift=active_shift,
                latitude=cash.latitude,
                longitude=cash.longitude,
                activity_type='CASH_COLLECTION',
                address_snapshot=f"Cash: {cash.receipt_number} - {cash.customer_name}"
            )

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.approval_status in ['APPROVED', 'VERIFIED']:
            raise ValidationError("Verified or Approved collection records are locked and cannot be edited.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.approval_status in ['APPROVED', 'VERIFIED']:
            raise ValidationError("Verified or Approved collection records are locked and cannot be deleted.")
        instance.delete()


@api_view(['POST'])
@permission_classes([IsCoordinatorOrAdmin])
def approve_collection_view(request):
    """
    Approval workflow:
    - Coordinator verification: PENDING -> VERIFIED
    - Admin approval: PENDING / VERIFIED -> APPROVED
    """
    user = request.user
    collection_type = request.data.get('type') # 'GOLD' or 'CASH'
    record_id = request.data.get('id')
    remarks = request.data.get('remarks', '')

    if collection_type == 'GOLD':
        item = GoldCollection.objects.filter(id=record_id).first()
    elif collection_type == 'CASH':
        item = CashCollection.objects.filter(id=record_id).first()
    else:
        return Response({'error': 'Invalid collection type.'}, status=status.HTTP_400_BAD_REQUEST)

    if not item:
        return Response({'error': 'Collection record not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Permission check: Coordinator can only verify assigned employees
    if user.role == 'COORDINATOR':
        if item.employee == user:
            return Response(
                {'error': 'Unauthorized: Project Coordinators cannot verify their own collections. Admin approval required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if item.employee.assigned_coordinator != user:
            return Response(
                {'error': 'Unauthorized: Project Coordinators can only verify collection records of their assigned sales executives.'},
                status=status.HTTP_403_FORBIDDEN
            )

    if item.approval_status == 'APPROVED':
        return Response({'message': 'Collection record is already approved.', 'approval_status': 'APPROVED'})

    if item.approval_status == 'REJECTED':
        return Response({'error': 'Cannot approve a rejected record. It must be resubmitted.'}, status=status.HTTP_400_BAD_REQUEST)

    prev_status = item.approval_status
    now = timezone.now()

    if user.role == 'ADMIN' or user.is_superuser:
        item.approval_status = 'APPROVED'
        item.approved_by_admin = user
        item.approved_at = now
        action_name = 'APPROVED'
        if not item.verified_by_coordinator:
            item.verified_by_coordinator = user
            item.verified_at = now
    else: # Coordinator
        item.approval_status = 'VERIFIED'
        item.verified_by_coordinator = user
        item.verified_at = now
        action_name = 'VERIFIED'

    item.save()

    # Log to audit trail
    log_kwargs = {
        'collection_type': collection_type,
        'action': action_name,
        'actor': user,
        'previous_status': prev_status,
        'new_status': item.approval_status,
        'remarks': remarks or f"{action_name} by {user.get_full_name() or user.username}",
    }
    if collection_type == 'GOLD':
        log_kwargs['gold_collection'] = item
    else:
        log_kwargs['cash_collection'] = item

    CollectionApprovalLog.objects.create(**log_kwargs)

    return Response({
        'message': f"Collection successfully {action_name.lower()}.",
        'approval_status': item.approval_status,
        'approved_at': now
    })


@api_view(['POST'])
@permission_classes([IsCoordinatorOrAdmin])
def reject_collection_view(request):
    """
    Rejection workflow: marks record as REJECTED with mandatory rejection remarks.
    """
    user = request.user
    collection_type = request.data.get('type')
    record_id = request.data.get('id')
    remarks = request.data.get('remarks', '')

    if not remarks.strip():
        return Response({'error': 'Rejection remarks are mandatory.'}, status=status.HTTP_400_BAD_REQUEST)

    if collection_type == 'GOLD':
        item = GoldCollection.objects.filter(id=record_id).first()
    elif collection_type == 'CASH':
        item = CashCollection.objects.filter(id=record_id).first()
    else:
        return Response({'error': 'Invalid collection type.'}, status=status.HTTP_400_BAD_REQUEST)

    if not item:
        return Response({'error': 'Collection record not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Permission check: Coordinator can only reject assigned employees
    if user.role == 'COORDINATOR':
        if item.employee.assigned_coordinator != user and item.employee != user:
            return Response(
                {'error': 'Unauthorized: Project Coordinators can only reject collection records of their assigned sales executives.'},
                status=status.HTTP_403_FORBIDDEN
            )

    if item.approval_status == 'APPROVED':
        return Response({'error': 'Approved collection records are locked and cannot be rejected.'}, status=status.HTTP_400_BAD_REQUEST)

    prev_status = item.approval_status
    item.approval_status = 'REJECTED'
    item.rejection_remarks = remarks
    item.save()

    log_kwargs = {
        'collection_type': collection_type,
        'action': 'REJECTED',
        'actor': user,
        'previous_status': prev_status,
        'new_status': 'REJECTED',
        'remarks': remarks,
    }
    if collection_type == 'GOLD':
        log_kwargs['gold_collection'] = item
    else:
        log_kwargs['cash_collection'] = item

    CollectionApprovalLog.objects.create(**log_kwargs)

    return Response({
        'message': 'Collection record has been rejected.',
        'approval_status': 'REJECTED'
    })


@api_view(['POST'])
@permission_classes([IsCoordinatorOrAdmin])
def reconcile_cash_view(request):
    """
    Cash deposit reconciliation tracking.
    """
    user = request.user
    record_id = request.data.get('id')
    deposit_status = request.data.get('deposit_status', 'RECONCILED')
    bank_reference = request.data.get('bank_reference', '')
    remarks = request.data.get('reconciliation_remarks', '')

    item = CashCollection.objects.filter(id=record_id).first()
    if not item:
        return Response({'error': 'Cash collection record not found.'}, status=status.HTTP_404_NOT_FOUND)

    if user.role == 'COORDINATOR':
        if item.employee != user and item.employee.assigned_coordinator != user:
            return Response(
                {'error': 'Unauthorized: Project Coordinators can only reconcile cash for assigned sales executives.'},
                status=status.HTTP_403_FORBIDDEN
            )

    item.deposit_status = deposit_status
    item.bank_reference = bank_reference
    item.reconciliation_remarks = remarks
    item.deposit_date = timezone.now()
    item.reconciled_by = user
    item.save()

    CollectionApprovalLog.objects.create(
        collection_type='CASH',
        cash_collection=item,
        action='RECONCILED',
        actor=user,
        previous_status=item.deposit_status,
        new_status=deposit_status,
        remarks=f"Deposit status updated to {deposit_status}. Ref: {bank_reference}. Remarks: {remarks}"
    )

    return Response({
        'message': 'Cash deposit status reconciled successfully.',
        'deposit_status': item.deposit_status
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def approval_logs_view(request):
    user = request.user
    collection_type = request.query_params.get('type')
    record_id = request.query_params.get('id')

    qs = CollectionApprovalLog.objects.all().select_related('actor', 'gold_collection', 'cash_collection')

    if user.role == 'ADMIN' or user.is_superuser:
        pass
    elif user.role == 'COORDINATOR':
        qs = qs.filter(
            Q(actor=user) |
            Q(gold_collection__employee__assigned_coordinator=user) |
            Q(cash_collection__employee__assigned_coordinator=user)
        )
    else: # SALES_EXECUTIVE
        qs = qs.filter(
            Q(actor=user) |
            Q(gold_collection__employee=user) |
            Q(cash_collection__employee=user)
        )

    if collection_type:
        qs = qs.filter(collection_type=collection_type)
    if record_id:
        if collection_type == 'GOLD':
            qs = qs.filter(gold_collection_id=record_id)
        elif collection_type == 'CASH':
            qs = qs.filter(cash_collection_id=record_id)

    serializer = CollectionApprovalLogSerializer(qs[:50], many=True)
    return Response(serializer.data)
