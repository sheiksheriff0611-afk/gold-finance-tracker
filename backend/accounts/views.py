from datetime import date, datetime, timedelta
from decimal import Decimal
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.contrib.auth import authenticate

from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, EmployeeTarget
from .serializers import (
    UserSerializer, UserCreateUpdateSerializer,
    ProfileUpdateSerializer, ChangePasswordSerializer,
    EmployeeTargetSerializer
)
from .permissions import IsAdmin, IsCoordinatorOrAdmin
from finance_collections.models import CustomerVisit, GoldCollection, CashCollection
from tracking.models import WorkShift, LocationPing


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'error': 'Please provide both username and password.'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)
    if not user:
        return Response({'error': 'Invalid username or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    if user.status == 'INACTIVE':
        return Response({'error': 'Account is inactive. Please contact administration.'}, status=status.HTTP_403_FORBIDDEN)

    refresh = RefreshToken.for_user(user)
    serializer = UserSerializer(user)

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    """
    Self profile update for any logged in user.
    """
    user = request.user
    serializer = ProfileUpdateSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'Profile updated successfully.',
            'user': UserSerializer(user).data
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """
    Change user password with old password verification.
    """
    user = request.user
    serializer = ChangePasswordSerializer(data=request.data)
    if serializer.is_valid():
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'error': 'Current password does not match.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password changed successfully.'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsAdmin()]
        elif self.action in ['update', 'partial_update']:
            return [IsCoordinatorOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = User.objects.all().select_related('assigned_coordinator')
        
        # Role filtering
        if user.role == 'ADMIN' or user.is_superuser:
            pass # Admin sees all
        elif user.role == 'COORDINATOR':
            qs = qs.filter(Q(assigned_coordinator=user) | Q(id=user.id))
        else: # SALES_EXECUTIVE
            qs = qs.filter(id=user.id)

        # Filters
        role_filter = self.request.query_params.get('role')
        if role_filter:
            qs = qs.filter(role=role_filter)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        coord_filter = self.request.query_params.get('coordinator')
        if coord_filter:
            qs = qs.filter(assigned_coordinator_id=coord_filter)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(username__icontains=search) |
                Q(employee_id__icontains=search) |
                Q(phone__icontains=search)
            )

        return qs

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateUpdateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != 'ADMIN' and not user.is_superuser:
            raise PermissionDenied("Only Administrators can create employee accounts.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        target = self.get_object()
        if user.role == 'SALES_EXECUTIVE':
            raise PermissionDenied("Sales Executives cannot modify employee records via this endpoint.")
        if user.role == 'COORDINATOR':
            if target.assigned_coordinator != user:
                raise PermissionDenied("Coordinators can only modify their assigned sales executives.")
            if 'role' in serializer.validated_data and serializer.validated_data['role'] != target.role:
                raise PermissionDenied("Coordinators cannot change employee roles.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role != 'ADMIN' and not user.is_superuser:
            raise PermissionDenied("Only Administrators can delete employee records.")
        instance.delete()


@api_view(['POST'])
@permission_classes([IsAdmin])
def reassign_coordinator_view(request):
    """
    Reassigns one or multiple sales executives to a Project Coordinator.
    Admin authorization required.
    """
    employee_ids = request.data.get('employee_ids', [])
    coordinator_id = request.data.get('coordinator_id') # can be None to unassign

    if isinstance(employee_ids, (int, str)):
        employee_ids = [employee_ids]
    elif not isinstance(employee_ids, list):
        employee_ids = list(employee_ids)

    if len(employee_ids) == 0:
        return Response({'error': 'Please select at least one employee.'}, status=status.HTTP_400_BAD_REQUEST)

    coordinator = None
    if coordinator_id:
        coordinator = User.objects.filter(id=coordinator_id, role='COORDINATOR').first()
        if not coordinator:
            return Response({'error': 'Invalid project coordinator selected.'}, status=status.HTTP_400_BAD_REQUEST)

    updated_count = User.objects.filter(id__in=employee_ids, role='SALES_EXECUTIVE').update(
        assigned_coordinator=coordinator
    )

    coord_name = coordinator.get_full_name() or coordinator.username if coordinator else 'Unassigned'
    return Response({
        'message': f"Successfully assigned {updated_count} sales executive(s) to {coord_name}.",
        'updated_count': updated_count
    })


@api_view(['GET'])
@permission_classes([IsCoordinatorOrAdmin])
def coordinator_workload_view(request):
    """
    Returns team workload and collection statistics for each project coordinator.
    Coordinators see their own assigned team; Admins see all coordinators.
    """
    coordinators = User.objects.filter(role='COORDINATOR', status='ACTIVE')
    if request.user.role == 'COORDINATOR':
        coordinators = coordinators.filter(id=request.user.id)

    data = []

    today = timezone.localdate()
    month_start = today.replace(day=1)

    for crd in coordinators:
        assigned_execs = User.objects.filter(assigned_coordinator=crd, role='SALES_EXECUTIVE')
        exec_ids = list(assigned_execs.values_list('id', flat=True))

        active_count = assigned_execs.filter(is_working=True).count()
        total_count = assigned_execs.count()

        gold_grams = float(GoldCollection.objects.filter(
            employee_id__in=exec_ids,
            collection_datetime__date__gte=month_start,
            approval_status__in=['APPROVED', 'VERIFIED']
        ).aggregate(tot=Sum('gold_weight_grams'))['tot'] or 0.0)

        cash_amount = float(CashCollection.objects.filter(
            employee_id__in=exec_ids,
            collection_datetime__date__gte=month_start,
            approval_status__in=['APPROVED', 'VERIFIED']
        ).aggregate(tot=Sum('cash_amount'))['tot'] or 0.0)

        data.append({
            'coordinator_id': crd.id,
            'name': crd.get_full_name() or crd.username,
            'employee_id': crd.employee_id,
            'phone': crd.phone,
            'email': crd.email,
            'city': crd.city,
            'branch': crd.branch,
            'total_assigned': total_count,
            'active_working': active_count,
            'month_gold_grams': round(gold_grams, 3),
            'month_cash_amount': cash_amount,
            'executives': [
                {
                    'id': e.id,
                    'name': e.get_full_name() or e.username,
                    'employee_id': e.employee_id,
                    'phone': e.phone,
                    'email': e.email,
                    'address': e.address,
                    'joining_date': e.joining_date.strftime('%Y-%m-%d') if e.joining_date else '—',
                    'is_working': e.is_working,
                    'status': e.status
                }
                for e in assigned_execs
            ]
        })

    # Also include unassigned executives count
    unassigned_execs = User.objects.filter(role='SALES_EXECUTIVE', assigned_coordinator__isnull=True)
    unassigned_data = [
        {
            'id': e.id,
            'name': e.get_full_name() or e.username,
            'employee_id': e.employee_id,
            'phone': e.phone,
            'status': e.status
        }
        for e in unassigned_execs
    ]

    return Response({
        'coordinators': data,
        'unassigned_executives': unassigned_data,
        'unassigned_count': len(unassigned_data)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_history_view(request, employee_id):
    """
    Returns complete individual history, collections, targets, and shift statistics for an employee.
    """
    target_emp = User.objects.filter(id=employee_id).first()
    if not target_emp:
        return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Permission check
    user = request.user
    if user.role == 'COORDINATOR' and target_emp.assigned_coordinator != user and target_emp.id != user.id:
        return Response({'error': 'Unauthorized to view this employee history.'}, status=status.HTTP_403_FORBIDDEN)
    elif user.role == 'SALES_EXECUTIVE' and user.id != target_emp.id:
        return Response({'error': 'Unauthorized to view other employee history.'}, status=status.HTTP_403_FORBIDDEN)

    gold_records = GoldCollection.objects.filter(employee=target_emp).order_by('-collection_datetime')
    cash_records = CashCollection.objects.filter(employee=target_emp).order_by('-collection_datetime')
    visits = CustomerVisit.objects.filter(employee=target_emp).order_by('-visit_datetime')
    shifts = WorkShift.objects.filter(employee=target_emp).order_by('-start_time')
    targets = EmployeeTarget.objects.filter(employee=target_emp).order_by('-start_date')

    total_gold_grams = float(gold_records.filter(approval_status='APPROVED').aggregate(tot=Sum('gold_weight_grams'))['tot'] or 0.0)
    pending_gold_grams = float(gold_records.filter(approval_status__in=['PENDING', 'VERIFIED']).aggregate(tot=Sum('gold_weight_grams'))['tot'] or 0.0)

    total_cash_amount = float(cash_records.filter(approval_status='APPROVED').aggregate(tot=Sum('cash_amount'))['tot'] or 0.0)
    pending_cash_amount = float(cash_records.filter(approval_status__in=['PENDING', 'VERIFIED']).aggregate(tot=Sum('cash_amount'))['tot'] or 0.0)

    return Response({
        'employee': UserSerializer(target_emp).data,
        'metrics': {
            'total_gold_grams': round(total_gold_grams, 3),
            'pending_gold_grams': round(pending_gold_grams, 3),
            'total_cash_amount': total_cash_amount,
            'pending_cash_amount': pending_cash_amount,
            'total_visits': visits.count(),
            'completed_visits': visits.filter(visit_status='COMPLETED').count(),
            'total_shifts': shifts.count(),
        },
        'recent_gold': [
            {
                'receipt_number': g.receipt_number,
                'customer_name': g.customer_name,
                'weight': float(g.gold_weight_grams),
                'purity': g.gold_purity,
                'value': float(g.estimated_value),
                'date': g.collection_datetime.strftime('%Y-%m-%d'),
                'status': g.approval_status
            }
            for g in gold_records[:10]
        ],
        'recent_cash': [
            {
                'receipt_number': c.receipt_number,
                'customer_name': c.customer_name,
                'amount': float(c.cash_amount),
                'method': c.get_payment_method_display(),
                'date': c.collection_datetime.strftime('%Y-%m-%d'),
                'status': c.approval_status,
                'deposit_status': c.get_deposit_status_display()
            }
            for c in cash_records[:10]
        ],
        'targets': EmployeeTargetSerializer(targets, many=True).data,
        'shifts': [
            {
                'id': s.id,
                'start_time': s.start_time.strftime('%Y-%m-%d %H:%M'),
                'end_time': s.end_time.strftime('%Y-%m-%d %H:%M') if s.end_time else 'Active',
                'is_active': s.is_active,
                'notes': s.notes
            }
            for s in shifts[:10]
        ]
    })


@api_view(['GET'])
@permission_classes([IsCoordinatorOrAdmin])
def coordinator_list_view(request):
    coordinators = User.objects.filter(role='COORDINATOR', status='ACTIVE')
    serializer = UserSerializer(coordinators, many=True)
    return Response(serializer.data)


class EmployeeTargetViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeTargetSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsCoordinatorOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = EmployeeTarget.objects.all().select_related('employee', 'created_by')
        if user.role == 'ADMIN' or user.is_superuser:
            return qs
        elif user.role == 'COORDINATOR':
            return qs.filter(employee__assigned_coordinator=user)
        else:
            return qs.filter(employee=user)

    def perform_create(self, serializer):
        user = self.request.user
        target_emp = serializer.validated_data.get('employee')
        if user.role == 'COORDINATOR' and target_emp and target_emp.assigned_coordinator != user:
            raise PermissionDenied("Coordinators can only assign targets to their assigned sales executives.")
        serializer.save(created_by=user)

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == 'COORDINATOR' and instance.employee.assigned_coordinator != user:
            raise PermissionDenied("Coordinators can only modify targets for their assigned sales executives.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == 'COORDINATOR' and instance.employee.assigned_coordinator != user:
            raise PermissionDenied("Coordinators can only delete targets for their assigned sales executives.")
        instance.delete()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats_view(request):
    user = request.user
    today = timezone.localdate()
    today_start = timezone.make_aware(datetime.combine(today, datetime.min.time()))

    # Determine scope based on user role
    if user.role == 'ADMIN' or user.is_superuser:
        employee_qs = User.objects.filter(role='SALES_EXECUTIVE')
        gold_qs = GoldCollection.objects.all()
        cash_qs = CashCollection.objects.all()
        visit_qs = CustomerVisit.objects.all()
    elif user.role == 'COORDINATOR':
        employee_qs = User.objects.filter(assigned_coordinator=user, role='SALES_EXECUTIVE')
        assigned_ids = list(employee_qs.values_list('id', flat=True))
        gold_qs = GoldCollection.objects.filter(employee_id__in=assigned_ids)
        cash_qs = CashCollection.objects.filter(employee_id__in=assigned_ids)
        visit_qs = CustomerVisit.objects.filter(employee_id__in=assigned_ids)
    else: # SALES_EXECUTIVE
        employee_qs = User.objects.filter(id=user.id)
        gold_qs = GoldCollection.objects.filter(employee=user)
        cash_qs = CashCollection.objects.filter(employee=user)
        visit_qs = CustomerVisit.objects.filter(employee=user)

    total_employees = employee_qs.count()
    active_employees = employee_qs.filter(is_working=True).count()

    total_gold_grams = float(gold_qs.filter(approval_status__in=['APPROVED', 'VERIFIED']).aggregate(total=Sum('gold_weight_grams'))['total'] or 0.0)
    pending_gold_grams = float(gold_qs.filter(approval_status='PENDING').aggregate(total=Sum('gold_weight_grams'))['total'] or 0.0)

    total_cash_amount = float(cash_qs.filter(approval_status__in=['APPROVED', 'VERIFIED']).aggregate(total=Sum('cash_amount'))['total'] or 0.0)
    pending_cash_amount = float(cash_qs.filter(approval_status='PENDING').aggregate(total=Sum('cash_amount'))['total'] or 0.0)

    today_visits = visit_qs.filter(visit_datetime__gte=today_start).count()
    pending_approvals = gold_qs.filter(approval_status='PENDING').count() + cash_qs.filter(approval_status='PENDING').count()

    # Employee performance calculation
    month_start = today.replace(day=1)
    performance_list = []
    
    perf_employees = employee_qs if user.role != 'SALES_EXECUTIVE' else [user]
    for emp in perf_employees:
        target = EmployeeTarget.objects.filter(
            employee=emp,
            start_date__lte=today,
            end_date__gte=today
        ).first()

        gold_achieved = float(gold_qs.filter(
            employee=emp,
            collection_datetime__date__gte=month_start,
            approval_status__in=['APPROVED', 'VERIFIED']
        ).aggregate(tot=Sum('gold_weight_grams'))['tot'] or 0.0)

        cash_achieved = float(cash_qs.filter(
            employee=emp,
            collection_datetime__date__gte=month_start,
            approval_status__in=['APPROVED', 'VERIFIED']
        ).aggregate(tot=Sum('cash_amount'))['tot'] or 0.0)

        gold_target = float(target.gold_target_grams) if target else 100.0
        cash_target = float(target.cash_target_amount) if target else 500000.0

        gold_pct = round((gold_achieved / gold_target) * 100, 1) if gold_target > 0 else 0
        cash_pct = round((cash_achieved / cash_target) * 100, 1) if cash_target > 0 else 0
        overall_pct = round((gold_pct + cash_pct) / 2, 1)

        performance_list.append({
            'employee_id': emp.employee_id,
            'name': emp.get_full_name() or emp.username,
            'phone': emp.phone,
            'is_working': emp.is_working,
            'gold_target': gold_target,
            'gold_achieved': gold_achieved,
            'gold_pct': gold_pct,
            'cash_target': cash_target,
            'cash_achieved': cash_achieved,
            'cash_pct': cash_pct,
            'overall_pct': overall_pct,
        })

    performance_list.sort(key=lambda x: x['overall_pct'], reverse=True)

    daily_chart = []
    for i in range(6, -1, -1):
        day_date = today - timedelta(days=i)
        g_day = float(gold_qs.filter(collection_datetime__date=day_date).aggregate(tot=Sum('gold_weight_grams'))['tot'] or 0.0)
        c_day = float(cash_qs.filter(collection_datetime__date=day_date).aggregate(tot=Sum('cash_amount'))['tot'] or 0.0)
        daily_chart.append({
            'date': day_date.strftime('%a, %b %d'),
            'gold_grams': g_day,
            'cash_amount': c_day,
        })

    monthly_chart = []
    for i in range(5, -1, -1):
        target_month = (today.month - i - 1) % 12 + 1
        target_year = today.year if today.month - i > 0 else today.year - 1
        month_label = date(target_year, target_month, 1).strftime('%b %Y')
        g_m = float(gold_qs.filter(collection_datetime__year=target_year, collection_datetime__month=target_month).aggregate(tot=Sum('gold_weight_grams'))['tot'] or 0.0)
        c_m = float(cash_qs.filter(collection_datetime__year=target_year, collection_datetime__month=target_month).aggregate(tot=Sum('cash_amount'))['tot'] or 0.0)
        monthly_chart.append({
            'month': month_label,
            'gold_grams': g_m,
            'cash_amount': c_m,
        })

    return Response({
        'role': user.role,
        'total_employees': total_employees,
        'active_employees': active_employees,
        'total_gold_grams': total_gold_grams,
        'pending_gold_grams': pending_gold_grams,
        'total_cash_amount': total_cash_amount,
        'pending_cash_amount': pending_cash_amount,
        'today_visits': today_visits,
        'pending_approvals': pending_approvals,
        'performance': performance_list,
        'daily_chart': daily_chart,
        'monthly_chart': monthly_chart,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cities_branches_view(request):
    """
    Returns configured operational cities and their assigned branch offices
    for coordinator and field staff onboarding.
    """
    CITIES_BRANCHES = [
        {
            'city': 'Chennai',
            'state': 'Tamil Nadu',
            'branches': [
                'T. Nagar Main Branch',
                'Anna Nagar Branch',
                'Adyar Branch',
                'Velachery Branch',
                'Tambaram Branch',
                'George Town (Parrys) Branch',
                'Mylapore Branch',
                'Porur Branch',
                'Guindy Branch',
                'Ambattur Branch'
            ]
        },
        {
            'city': 'Coimbatore',
            'state': 'Tamil Nadu',
            'branches': [
                'Gandhipuram Main Branch',
                'R.S. Puram Branch',
                'Peelamedu Branch',
                'Singanallur Branch',
                'Saibaba Colony Branch',
                'Ukkadam Branch'
            ]
        },
        {
            'city': 'Madurai',
            'state': 'Tamil Nadu',
            'branches': [
                'West Masi Street Main Branch',
                'KK Nagar Branch',
                'Simmakkal Branch',
                'Anna Nagar Madurai Branch',
                'Tallakulam Branch'
            ]
        },
        {
            'city': 'Tiruchirappalli (Trichy)',
            'state': 'Tamil Nadu',
            'branches': [
                'Thillai Nagar Main Branch',
                'Cantonment Branch',
                'Srirangam Branch',
                'K.K. Nagar Trichy Branch'
            ]
        },
        {
            'city': 'Salem',
            'state': 'Tamil Nadu',
            'branches': [
                'Junction Main Road Branch',
                'Fairlands Branch',
                'Meyyanur Branch',
                'Shevapet Branch'
            ]
        },
        {
            'city': 'Tirunelveli',
            'state': 'Tamil Nadu',
            'branches': [
                'Town Hall Main Branch',
                'Palayamkottai Branch',
                'Vannarpettai Branch'
            ]
        },
        {
            'city': 'Erode',
            'state': 'Tamil Nadu',
            'branches': [
                'Brough Road Main Branch',
                'Perundurai Road Branch',
                'Surampatti Branch'
            ]
        },
        {
            'city': 'Vellore',
            'state': 'Tamil Nadu',
            'branches': [
                'Officer’s Line Main Branch',
                'Katpadi Branch',
                'Bagayam Branch'
            ]
        },
        {
            'city': 'Thanjavur',
            'state': 'Tamil Nadu',
            'branches': [
                'South Rampart Main Branch',
                'Medical College Road Branch'
            ]
        },
        {
            'city': 'Dindigul',
            'state': 'Tamil Nadu',
            'branches': [
                'Main Bazaar Branch',
                'Salai Road Branch'
            ]
        },
        {
            'city': 'Tiruppur',
            'state': 'Tamil Nadu',
            'branches': [
                'Kumaran Road Main Branch',
                'Avinashi Road Branch'
            ]
        },
        {
            'city': 'Bengaluru',
            'state': 'Karnataka',
            'branches': [
                'MG Road Main Branch',
                'Koramangala Branch',
                'Indiranagar Branch',
                'Jayanagar Branch',
                'Whitefield Branch',
                'Marathahalli Branch',
                'Malleshwaram Branch',
                'HSR Layout Branch'
            ]
        },
        {
            'city': 'Hyderabad',
            'state': 'Telangana',
            'branches': [
                'Banjara Hills Main Branch',
                'Ameerpet Branch',
                'Dilsukhnagar Branch',
                'Secunderabad Branch',
                'Kukatpally Branch',
                'Gachibowli Branch'
            ]
        },
        {
            'city': 'Kochi',
            'state': 'Kerala',
            'branches': [
                'MG Road Kochi Branch',
                'Edappally Branch',
                'Kaloor Branch',
                'Aluva Branch'
            ]
        },
        {
            'city': 'Thiruvananthapuram',
            'state': 'Kerala',
            'branches': [
                'MG Road Trivandrum Branch',
                'Kazhakkoottam Branch'
            ]
        },
        {
            'city': 'Mumbai',
            'state': 'Maharashtra',
            'branches': [
                'Fort Main Branch',
                'Andheri West Branch',
                'Dadar Branch',
                'Bandra Kurla Complex (BKC) Branch',
                'Borivali Branch',
                'Thane Branch'
            ]
        },
        {
            'city': 'Pune',
            'state': 'Maharashtra',
            'branches': [
                'FC Road Main Branch',
                'Kothrud Branch',
                'Hinjewadi Branch'
            ]
        },
        {
            'city': 'Delhi NCR',
            'state': 'Delhi NCR',
            'branches': [
                'Connaught Place Main Branch',
                'Karol Bagh Branch',
                'Nehru Place Branch',
                'Noida Sector 18 Branch',
                'Gurugram Cyber Hub Branch'
            ]
        }
    ]
    return Response(CITIES_BRANCHES)

