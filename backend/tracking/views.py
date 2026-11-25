from datetime import datetime, date
from django.utils import timezone
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import WorkShift, LocationPing
from .serializers import WorkShiftSerializer, LocationPingSerializer
from accounts.models import User
from accounts.permissions import IsCoordinatorOrAdmin
from finance_collections.models import CustomerVisit, GoldCollection, CashCollection


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_work_shift(request):
    """
    Start Work / End Work action for Sales Executives.
    Captures GPS location, timestamp, notes, and battery %.
    """
    user = request.user
    action = request.data.get('action') # 'START' or 'END'
    latitude = request.data.get('latitude')
    longitude = request.data.get('longitude')
    notes = request.data.get('notes', '')
    battery = request.data.get('battery')

    if user.status != 'ACTIVE':
        return Response({'error': 'Account is inactive. Cannot operate work shift.'}, status=status.HTTP_403_FORBIDDEN)

    if latitude is not None and longitude is not None:
        try:
            lat = float(latitude)
            lng = float(longitude)
            if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
                return Response({'error': 'Latitude must be between -90 and 90, Longitude between -180 and 180.'}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'error': 'GPS coordinates must be valid numbers.'}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.now()

    if action == 'START':
        user.is_working = True
        user.gps_enabled = bool(latitude and longitude)
        if latitude and longitude:
            user.current_latitude = float(latitude)
            user.current_longitude = float(longitude)
            user.last_location_time = now
        user.save()

        # Close any lingering open shifts first to guarantee clean session
        WorkShift.objects.filter(employee=user, is_active=True).update(is_active=False, end_time=now)

        # Create new WorkShift
        shift = WorkShift.objects.create(
            employee=user,
            start_time=now,
            start_latitude=float(latitude) if latitude else None,
            start_longitude=float(longitude) if longitude else None,
            is_active=True,
            notes=notes
        )

        # Log LocationPing
        if latitude and longitude:
            LocationPing.objects.create(
                employee=user,
                shift=shift,
                latitude=float(latitude),
                longitude=float(longitude),
                activity_type='START_WORK',
                battery_level=battery,
                address_snapshot=notes[:255] if notes else 'Shift Started'
            )

        return Response({
            'message': 'Work shift started successfully. GPS telemetry active.',
            'is_working': True,
            'shift_id': shift.id,
            'start_time': shift.start_time
        })

    elif action == 'END':
        user.is_working = False
        if latitude and longitude:
            user.current_latitude = float(latitude)
            user.current_longitude = float(longitude)
            user.last_location_time = now
        user.save()

        # Close active shift
        active_shift = WorkShift.objects.filter(employee=user, is_active=True).first()
        if active_shift:
            active_shift.is_active = False
            active_shift.end_time = now
            if latitude and longitude:
                active_shift.end_latitude = float(latitude)
                active_shift.end_longitude = float(longitude)
            active_shift.save()

        # Log LocationPing
        if latitude and longitude:
            LocationPing.objects.create(
                employee=user,
                shift=active_shift,
                latitude=float(latitude),
                longitude=float(longitude),
                activity_type='END_WORK',
                battery_level=battery,
                address_snapshot=notes[:255] if notes else 'Shift Ended'
            )

        return Response({
            'message': 'Work shift ended successfully. GPS tracking paused.',
            'is_working': False
        })

    return Response({'error': 'Invalid action. Must be START or END.'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def active_shift_details_view(request):
    """
    Returns active shift timer, start coordinates, and elapsed duration.
    """
    user = request.user
    active_shift = WorkShift.objects.filter(employee=user, is_active=True).first()
    if not active_shift:
        return Response({'is_active': False, 'shift': None})

    now = timezone.now()
    elapsed_seconds = int((now - active_shift.start_time).total_seconds())

    return Response({
        'is_active': True,
        'shift': {
            'id': active_shift.id,
            'start_time': active_shift.start_time,
            'elapsed_seconds': elapsed_seconds,
            'start_latitude': active_shift.start_latitude,
            'start_longitude': active_shift.start_longitude,
            'notes': active_shift.notes,
            'pings_count': active_shift.pings.count()
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def shift_history_view(request):
    """
    Returns shift history for current user or filtered employee.
    """
    user = request.user
    emp_id = request.query_params.get('employee_id')

    qs = WorkShift.objects.all().order_by('-start_time')
    if user.role == 'ADMIN' or user.is_superuser:
        if emp_id:
            if str(emp_id).isdigit():
                qs = qs.filter(employee_id=int(emp_id))
            else:
                qs = qs.filter(employee__employee_id=emp_id)
    elif user.role == 'COORDINATOR':
        qs = qs.filter(employee__assigned_coordinator=user)
        if emp_id:
            if str(emp_id).isdigit():
                qs = qs.filter(employee_id=int(emp_id))
            else:
                qs = qs.filter(employee__employee_id=emp_id)
    else: # SALES_EXECUTIVE
        qs = qs.filter(employee=user)

    data = []
    for s in qs[:30]:
        duration_minutes = None
        if s.end_time:
            duration_minutes = round((s.end_time - s.start_time).total_seconds() / 60, 1)
        data.append({
            'id': s.id,
            'employee_name': s.employee.get_full_name() or s.employee.username,
            'employee_id': s.employee.employee_id,
            'start_time': s.start_time.strftime('%Y-%m-%d %H:%M'),
            'end_time': s.end_time.strftime('%Y-%m-%d %H:%M') if s.end_time else 'Active Now',
            'duration_minutes': duration_minutes,
            'is_active': s.is_active,
            'pings_count': s.pings.count(),
            'notes': s.notes
        })

    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ping_location(request):
    """
    Periodic or event-based GPS ping from Sales Executive app.
    Transparently captures location after permission is granted.
    """
    user = request.user
    latitude = request.data.get('latitude')
    longitude = request.data.get('longitude')
    accuracy = request.data.get('accuracy', 10.0)
    battery = request.data.get('battery')
    activity_type = request.data.get('activity_type', 'PERIODIC_PING')
    notes = request.data.get('notes', '')

    if user.status != 'ACTIVE':
        return Response({'error': 'Account is inactive. Cannot record GPS telemetry.'}, status=status.HTTP_403_FORBIDDEN)

    if latitude is None or longitude is None:
        user.gps_enabled = False
        user.save()
        return Response({'warning': 'GPS coordinates not provided or location permission denied.'}, status=status.HTTP_200_OK)

    try:
        lat = float(latitude)
        lng = float(longitude)
        if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
            return Response({'error': 'Latitude must be between -90 and 90, Longitude between -180 and 180.'}, status=status.HTTP_400_BAD_REQUEST)
    except (ValueError, TypeError):
        return Response({'error': 'GPS coordinates must be valid numbers.'}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.now()
    user.current_latitude = float(latitude)
    user.current_longitude = float(longitude)
    user.last_location_time = now
    user.gps_enabled = True
    user.save()

    active_shift = WorkShift.objects.filter(employee=user, is_active=True).first()

    ping = LocationPing.objects.create(
        employee=user,
        shift=active_shift,
        latitude=float(latitude),
        longitude=float(longitude),
        accuracy=float(accuracy),
        activity_type=activity_type,
        battery_level=battery,
        address_snapshot=notes[:255]
    )

    return Response({
        'status': 'recorded',
        'ping_id': ping.id,
        'timestamp': ping.timestamp
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def live_locations_view(request):
    """
    Returns live locations of employees.
    - Admin: all sales executives
    - Coordinator: assigned sales executives
    - Executive: self
    """
    user = request.user
    qs = User.objects.filter(status='ACTIVE')

    if user.role == 'ADMIN' or user.is_superuser:
        qs = qs.filter(role='SALES_EXECUTIVE')
    elif user.role == 'COORDINATOR':
        qs = qs.filter(assigned_coordinator=user, role='SALES_EXECUTIVE')
    else:
        qs = qs.filter(id=user.id)

    data = []
    now = timezone.now()
    for emp in qs:
        active_shift = WorkShift.objects.filter(employee=emp, is_active=True).first()
        elapsed_minutes = None
        if active_shift:
            elapsed_minutes = round((now - active_shift.start_time).total_seconds() / 60, 0)

        data.append({
            'id': emp.id,
            'employee_id': emp.employee_id,
            'name': emp.get_full_name() or emp.username,
            'phone': emp.phone,
            'role': emp.role,
            'is_working': emp.is_working,
            'gps_enabled': emp.gps_enabled,
            'latitude': emp.current_latitude,
            'longitude': emp.current_longitude,
            'last_location_time': emp.last_location_time,
            'assigned_coordinator_name': emp.assigned_coordinator.get_full_name() if emp.assigned_coordinator else None,
            'shift_start_time': active_shift.start_time if active_shift else None,
            'elapsed_minutes': elapsed_minutes,
        })

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_breadcrumbs_view(request, employee_id):
    """
    Returns breadcrumbs trail and customer visit/collection coordinates
    for an employee on a given date (default today).
    """
    user = request.user
    if str(employee_id).isdigit():
        target_emp = User.objects.filter(id=int(employee_id)).first()
    else:
        target_emp = User.objects.filter(employee_id=employee_id).first()

    if not target_emp:
        return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Permission check: Coordinators can only view assigned
    if user.role == 'COORDINATOR' and target_emp.assigned_coordinator != user and target_emp.id != user.id:
        return Response({'error': 'Unauthorized to view this employee.'}, status=status.HTTP_403_FORBIDDEN)
    elif user.role == 'SALES_EXECUTIVE' and user.id != target_emp.id:
        return Response({'error': 'Unauthorized to view other employees.'}, status=status.HTTP_403_FORBIDDEN)

    date_str = request.query_params.get('date')
    if date_str:
        try:
            filter_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            filter_date = timezone.localdate()
    else:
        filter_date = timezone.localdate()

    pings = LocationPing.objects.filter(
        employee=target_emp,
        timestamp__date=filter_date
    ).order_by('timestamp')

    # Also fetch visits, gold, and cash collections on this date with coordinates
    visits = CustomerVisit.objects.filter(
        employee=target_emp,
        visit_datetime__date=filter_date,
        latitude__isnull=False,
        longitude__isnull=False
    )
    gold = GoldCollection.objects.filter(
        employee=target_emp,
        collection_datetime__date=filter_date,
        latitude__isnull=False,
        longitude__isnull=False
    )
    cash = CashCollection.objects.filter(
        employee=target_emp,
        collection_datetime__date=filter_date,
        latitude__isnull=False,
        longitude__isnull=False
    )

    serializer = LocationPingSerializer(pings, many=True)
    return Response({
        'employee_id': target_emp.employee_id,
        'name': target_emp.get_full_name() or target_emp.username,
        'date': filter_date.strftime('%Y-%m-%d'),
        'total_pings': pings.count(),
        'breadcrumbs': serializer.data,
        'visits': [
            {
                'id': v.id,
                'customer_name': v.customer_name,
                'customer_mobile': v.customer_mobile,
                'address': v.customer_address,
                'latitude': v.latitude,
                'longitude': v.longitude,
                'purpose': v.get_visit_purpose_display(),
                'status': v.get_visit_status_display(),
                'time': v.visit_datetime.strftime('%H:%M'),
                'remarks': v.remarks
            }
            for v in visits
        ],
        'gold_collections': [
            {
                'id': g.id,
                'receipt_number': g.receipt_number,
                'customer_name': g.customer_name,
                'weight': float(g.gold_weight_grams),
                'purity': g.gold_purity,
                'latitude': g.latitude,
                'longitude': g.longitude,
                'time': g.collection_datetime.strftime('%H:%M')
            }
            for g in gold
        ],
        'cash_collections': [
            {
                'id': c.id,
                'receipt_number': c.receipt_number,
                'customer_name': c.customer_name,
                'amount': float(c.cash_amount),
                'latitude': c.latitude,
                'longitude': c.longitude,
                'time': c.collection_datetime.strftime('%H:%M')
            }
            for c in cash
        ]
    })
