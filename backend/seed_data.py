import os
import django
from datetime import date, datetime, timedelta
from decimal import Decimal
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gold_tracker.settings')
django.setup()

from accounts.models import User, EmployeeTarget
from tracking.models import WorkShift, LocationPing
from finance_collections.models import CustomerVisit, GoldCollection, CashCollection, CollectionApprovalLog


def seed():
    print("Seeding initial data for GOLD FINANCE...")
    
    # 1. Create Admin
    admin_user, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@goldfinance.com',
            'first_name': 'Rajesh',
            'last_name': 'Sharma',
            'role': 'ADMIN',
            'employee_id': 'ADM-1001',
            'phone': '+91 98765 43210',
            'address': 'Headquarters, 5th Floor, Anna Salai, Chennai',
            'is_staff': True,
            'is_superuser': True,
            'status': 'ACTIVE',
        }
    )
    admin_user.set_password('admin123')
    admin_user.save()
    print(f"Admin: {admin_user.username} (Password: admin123)")

    # 2. Create Project Coordinators
    coord1, _ = User.objects.get_or_create(
        username='coordinator1',
        defaults={
            'email': 'crd.priya@goldfinance.com',
            'first_name': 'Priya',
            'last_name': 'Natarajan',
            'role': 'COORDINATOR',
            'employee_id': 'CRD-2001',
            'phone': '+91 98412 34567',
            'address': 'Regional Branch North, T. Nagar, Chennai',
            'is_staff': True,
            'status': 'ACTIVE',
            'joining_date': date(2023, 3, 15),
        }
    )
    coord1.set_password('coord123')
    coord1.save()

    coord2, _ = User.objects.get_or_create(
        username='coordinator2',
        defaults={
            'email': 'crd.vikram@goldfinance.com',
            'first_name': 'Vikram',
            'last_name': 'Verma',
            'role': 'COORDINATOR',
            'employee_id': 'CRD-2002',
            'phone': '+91 98450 98765',
            'address': 'Regional Branch South, Velachery, Chennai',
            'is_staff': True,
            'status': 'ACTIVE',
            'joining_date': date(2023, 6, 1),
        }
    )
    coord2.set_password('coord123')
    coord2.save()
    print("Project Coordinators seeded: coordinator1, coordinator2 (Password: coord123)")

    # 3. Create Sales Executives
    exec1, _ = User.objects.get_or_create(
        username='executive1',
        defaults={
            'email': 'karthik.s@goldfinance.com',
            'first_name': 'Karthik',
            'last_name': 'Sundaram',
            'role': 'SALES_EXECUTIVE',
            'employee_id': 'EMP-5001',
            'phone': '+91 97890 12345',
            'address': '14, Gandhi Road, Tambaram, Chennai',
            'assigned_coordinator': coord1,
            'status': 'ACTIVE',
            'is_working': True,
            'current_latitude': 13.0418,
            'current_longitude': 80.2341,
            'last_location_time': timezone.now() - timedelta(minutes=15),
            'gps_enabled': True,
            'joining_date': date(2024, 1, 10),
        }
    )
    exec1.set_password('exec123')
    exec1.save()

    exec2, _ = User.objects.get_or_create(
        username='executive2',
        defaults={
            'email': 'anitha.r@goldfinance.com',
            'first_name': 'Anitha',
            'last_name': 'Ramesh',
            'role': 'SALES_EXECUTIVE',
            'employee_id': 'EMP-5002',
            'phone': '+91 98840 56789',
            'address': '22, Main Bazaar, Mylapore, Chennai',
            'assigned_coordinator': coord1,
            'status': 'ACTIVE',
            'is_working': True,
            'current_latitude': 13.0336,
            'current_longitude': 80.2677,
            'last_location_time': timezone.now() - timedelta(minutes=8),
            'gps_enabled': True,
            'joining_date': date(2024, 2, 1),
        }
    )
    exec2.set_password('exec123')
    exec2.save()

    exec3, _ = User.objects.get_or_create(
        username='executive3',
        defaults={
            'email': 'suresh.k@goldfinance.com',
            'first_name': 'Suresh',
            'last_name': 'Kumar',
            'role': 'SALES_EXECUTIVE',
            'employee_id': 'EMP-5003',
            'phone': '+91 94440 11223',
            'address': '55, Lake View Road, Adyar, Chennai',
            'assigned_coordinator': coord2,
            'status': 'ACTIVE',
            'is_working': False,
            'current_latitude': 13.0012,
            'current_longitude': 80.2565,
            'last_location_time': timezone.now() - timedelta(hours=3),
            'gps_enabled': False,
            'joining_date': date(2024, 4, 15),
        }
    )
    exec3.set_password('exec123')
    exec3.save()
    print("Sales Executives seeded: executive1, executive2, executive3 (Password: exec123)")

    # 4. Set Targets
    today = date.today()
    month_start = today.replace(day=1)
    # Next month start minus 1 day
    if today.month == 12:
        month_end = date(today.year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(today.year, today.month + 1, 1) - timedelta(days=1)

    EmployeeTarget.objects.get_or_create(
        employee=exec1,
        period='MONTHLY',
        start_date=month_start,
        end_date=month_end,
        defaults={
            'gold_target_grams': Decimal('150.000'),
            'cash_target_amount': Decimal('750000.00'),
            'created_by': coord1,
        }
    )

    EmployeeTarget.objects.get_or_create(
        employee=exec2,
        period='MONTHLY',
        start_date=month_start,
        end_date=month_end,
        defaults={
            'gold_target_grams': Decimal('120.000'),
            'cash_target_amount': Decimal('600000.00'),
            'created_by': coord1,
        }
    )

    EmployeeTarget.objects.get_or_create(
        employee=exec3,
        period='MONTHLY',
        start_date=month_start,
        end_date=month_end,
        defaults={
            'gold_target_grams': Decimal('100.000'),
            'cash_target_amount': Decimal('500000.00'),
            'created_by': coord2,
        }
    )
    print("Targets seeded.")

    # 5. Work Shifts & Location Pings
    shift1, _ = WorkShift.objects.get_or_create(
        employee=exec1,
        is_active=True,
        defaults={
            'start_time': timezone.now() - timedelta(hours=4),
            'start_latitude': 13.0418,
            'start_longitude': 80.2341,
            'notes': 'Morning customer visits in T. Nagar and Kodambakkam',
        }
    )

    # Add breadcrumbs for shift 1
    pings_data = [
        (13.0418, 80.2341, 'START_WORK', 4),
        (13.0450, 80.2360, 'CUSTOMER_VISIT', 3),
        (13.0485, 80.2395, 'GOLD_COLLECTION', 2),
        (13.0510, 80.2420, 'CASH_COLLECTION', 1),
        (13.0418, 80.2341, 'PERIODIC_PING', 0.25),
    ]
    for lat, lng, act, hrs_ago in pings_data:
        LocationPing.objects.create(
            employee=exec1,
            shift=shift1,
            latitude=lat,
            longitude=lng,
            accuracy=8.5,
            activity_type=act,
            battery_level=82,
            timestamp=timezone.now() - timedelta(hours=hrs_ago)
        )

    # 6. Customer Visits
    v1, _ = CustomerVisit.objects.get_or_create(
        employee=exec1,
        customer_name='Murugan Swaminathan',
        defaults={
            'customer_mobile': '+91 94441 55667',
            'customer_address': '45, Ranganathan Street, T. Nagar, Chennai',
            'visit_datetime': timezone.now() - timedelta(hours=3),
            'latitude': 13.0450,
            'longitude': 80.2360,
            'visit_purpose': 'GOLD_COLLECTION',
            'visit_status': 'COMPLETED',
            'remarks': 'Customer pledged 22K bangles for business loan expansion.',
        }
    )

    v2, _ = CustomerVisit.objects.get_or_create(
        employee=exec1,
        customer_name='Devi Meenakshi',
        defaults={
            'customer_mobile': '+91 98402 33445',
            'customer_address': '12, Usman Road, T. Nagar, Chennai',
            'visit_datetime': timezone.now() - timedelta(hours=1),
            'latitude': 13.0510,
            'longitude': 80.2420,
            'visit_purpose': 'CASH_COLLECTION',
            'visit_status': 'COMPLETED',
            'remarks': 'Monthly loan interest payment received in cash.',
        }
    )

    v3, _ = CustomerVisit.objects.get_or_create(
        employee=exec2,
        customer_name='Subramanian Iyer',
        defaults={
            'customer_mobile': '+91 97910 88990',
            'customer_address': '8, North Mada Street, Mylapore, Chennai',
            'visit_datetime': timezone.now() - timedelta(hours=2),
            'latitude': 13.0336,
            'longitude': 80.2677,
            'visit_purpose': 'GOLD_COLLECTION',
            'visit_status': 'COMPLETED',
            'remarks': 'Gold necklace collection for agricultural gold loan scheme.',
        }
    )

    # 7. Gold Collections
    g1, _ = GoldCollection.objects.get_or_create(
        receipt_number='GLD-2026-001',
        defaults={
            'employee': exec1,
            'customer_name': 'Murugan Swaminathan',
            'customer_mobile': '+91 94441 55667',
            'customer_address': '45, Ranganathan Street, T. Nagar, Chennai',
            'jewellery_type': 'BANGLES',
            'jewellery_description': '4 pieces solid 916 BIS Hallmarked gold bangles',
            'gold_weight_grams': Decimal('48.500'),
            'gold_purity': '22K',
            'estimated_value': Decimal('325000.00'),
            'collection_datetime': timezone.now() - timedelta(hours=2),
            'latitude': 13.0485,
            'longitude': 80.2395,
            'approval_status': 'PENDING',
            'remarks': 'Purity acid test and hallmark verified on spot.',
        }
    )

    g2, _ = GoldCollection.objects.get_or_create(
        receipt_number='GLD-2026-002',
        defaults={
            'employee': exec2,
            'customer_name': 'Subramanian Iyer',
            'customer_mobile': '+91 97910 88990',
            'customer_address': '8, North Mada Street, Mylapore, Chennai',
            'jewellery_type': 'NECKLACE',
            'jewellery_description': 'Antique heritage bridal necklace with stone studding',
            'gold_weight_grams': Decimal('64.200'),
            'gold_purity': '22K',
            'estimated_value': Decimal('430000.00'),
            'collection_datetime': timezone.now() - timedelta(hours=2),
            'latitude': 13.0336,
            'longitude': 80.2677,
            'approval_status': 'VERIFIED',
            'verified_by_coordinator': coord1,
            'verified_at': timezone.now() - timedelta(hours=1),
            'remarks': 'Weight verified on digital precision scale.',
        }
    )

    g3, _ = GoldCollection.objects.get_or_create(
        receipt_number='GLD-2026-003',
        defaults={
            'employee': exec1,
            'customer_name': 'Chitra Balachander',
            'customer_mobile': '+91 98410 77112',
            'customer_address': '19, Venkatnarayana Road, T. Nagar, Chennai',
            'jewellery_type': 'CHAIN',
            'jewellery_description': '24K fine gold bar pendant with 22K rope chain',
            'gold_weight_grams': Decimal('32.100'),
            'gold_purity': '24K',
            'estimated_value': Decimal('235000.00'),
            'collection_datetime': timezone.now() - timedelta(days=1),
            'latitude': 13.0420,
            'longitude': 80.2380,
            'approval_status': 'APPROVED',
            'verified_by_coordinator': coord1,
            'verified_at': timezone.now() - timedelta(hours=20),
            'approved_by_admin': admin_user,
            'approved_at': timezone.now() - timedelta(hours=18),
            'remarks': 'Fully approved and transferred to vault.',
        }
    )

    # 8. Cash Collections
    c1, _ = CashCollection.objects.get_or_create(
        receipt_number='CSH-2026-001',
        defaults={
            'employee': exec1,
            'customer_name': 'Devi Meenakshi',
            'customer_mobile': '+91 98402 33445',
            'customer_address': '12, Usman Road, T. Nagar, Chennai',
            'cash_amount': Decimal('75000.00'),
            'collection_datetime': timezone.now() - timedelta(hours=1),
            'latitude': 13.0510,
            'longitude': 80.2420,
            'payment_method': 'CASH_HANDOVER',
            'approval_status': 'PENDING',
            'deposit_status': 'IN_HAND',
            'remarks': 'Cash counted and verified with UV currency detector.',
        }
    )

    c2, _ = CashCollection.objects.get_or_create(
        receipt_number='CSH-2026-002',
        defaults={
            'employee': exec2,
            'customer_name': 'Gopalakrishnan N.',
            'customer_mobile': '+91 94450 66778',
            'customer_address': '77, Luz Church Road, Mylapore, Chennai',
            'cash_amount': Decimal('120000.00'),
            'collection_datetime': timezone.now() - timedelta(days=1),
            'latitude': 13.0360,
            'longitude': 80.2640,
            'payment_method': 'IMPS_UPI_QR',
            'approval_status': 'APPROVED',
            'verified_by_coordinator': coord1,
            'verified_at': timezone.now() - timedelta(hours=22),
            'approved_by_admin': admin_user,
            'approved_at': timezone.now() - timedelta(hours=20),
            'deposit_status': 'BANK_DEPOSITED',
            'deposit_date': timezone.now() - timedelta(hours=19),
            'bank_reference': 'HDFC-UTR-99283741829',
            'remarks': 'UPI transaction verified against bank statement.',
        }
    )

    print("Seed data completed successfully!")


if __name__ == '__main__':
    seed()

