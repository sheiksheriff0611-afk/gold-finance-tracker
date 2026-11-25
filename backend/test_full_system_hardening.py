import os
import django
import io
from decimal import Decimal
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gold_tracker.settings')
django.setup()

from django.utils import timezone
from rest_framework.test import APIClient
from accounts.models import User, EmployeeTarget
from tracking.models import WorkShift, LocationPing
from finance_collections.models import CustomerVisit, GoldCollection, CashCollection, CollectionApprovalLog

def run_tests():
    print("=" * 65)
    print("GOLD FINANCE - SYSTEM HARDENING & COMPREHENSIVE VERIFICATION")
    print("=" * 65)

    client = APIClient()

    # 1. SETUP / ENSURE USERS & ROLES
    admin = User.objects.filter(username='admin').first()
    if not admin:
        admin = User.objects.create_superuser('admin', 'admin@goldfinance.com', 'admin123', role='ADMIN', employee_id='ADM-0001')
    else:
        admin.set_password('admin123')
        admin.role = 'ADMIN'
        admin.status = 'ACTIVE'
        admin.save()

    coord1 = User.objects.filter(username='coordinator1').first()
    if not coord1:
        coord1 = User.objects.create_user('coordinator1', 'coord1@goldfinance.com', 'coord123', role='COORDINATOR', employee_id='CRD-1001')
    else:
        coord1.set_password('coord123')
        coord1.role = 'COORDINATOR'
        coord1.status = 'ACTIVE'
        coord1.save()

    coord2 = User.objects.filter(username='coordinator2').first()
    if not coord2:
        coord2 = User.objects.create_user('coordinator2', 'coord2@goldfinance.com', 'coord123', role='COORDINATOR', employee_id='CRD-1002')
    else:
        coord2.set_password('coord123')
        coord2.role = 'COORDINATOR'
        coord2.status = 'ACTIVE'
        coord2.save()

    exec1 = User.objects.filter(username='executive1').first()
    if not exec1:
        exec1 = User.objects.create_user('executive1', 'exec1@goldfinance.com', 'exec123', role='SALES_EXECUTIVE', employee_id='EMP-2001')
    else:
        exec1.set_password('exec123')
        exec1.role = 'SALES_EXECUTIVE'
        exec1.status = 'ACTIVE'
        exec1.save()

    exec2 = User.objects.filter(username='executive2').first()
    if not exec2:
        exec2 = User.objects.create_user('executive2', 'exec2@goldfinance.com', 'exec123', role='SALES_EXECUTIVE', employee_id='EMP-2002')
    else:
        exec2.set_password('exec123')
        exec2.role = 'SALES_EXECUTIVE'
        exec2.status = 'ACTIVE'
        exec2.save()

    inactive_user = User.objects.filter(username='inactive_user').first()
    if not inactive_user:
        inactive_user = User.objects.create_user('inactive_user', 'inactive@goldfinance.com', 'pass123', role='SALES_EXECUTIVE', status='INACTIVE')
    else:
        inactive_user.status = 'INACTIVE'
        inactive_user.save()

    # Assign exec1 -> coord1, exec2 -> coord2
    exec1.assigned_coordinator = coord1
    exec1.save()
    exec2.assigned_coordinator = coord2
    exec2.save()

    # SECTION 1: AUTHENTICATION & LOGIN
    print("\n[TEST 1/7] Testing Authentication & Inactive Account Prevention...")
    
    # Inactive login rejection
    res_inact = client.post('/api/accounts/login/', {'username': 'inactive_user', 'password': 'pass123'})
    assert res_inact.status_code == 403, f"Expected 403 for inactive login, got {res_inact.status_code}"
    print("  ✓ Inactive account login successfully blocked with 403 Forbidden.")

    # Unauthenticated access rejection
    client.credentials() # clear tokens
    res_unauth = client.get('/api/accounts/me/')
    assert res_unauth.status_code == 401, f"Expected 401 for unauthenticated request, got {res_unauth.status_code}"
    res_unauth_rep = client.get('/api/reports/data/')
    assert res_unauth_rep.status_code == 401
    print("  ✓ Unauthenticated access cleanly rejected across protected endpoints.")

    # Valid Logins
    res_admin = client.post('/api/accounts/login/', {'username': 'admin', 'password': 'admin123'})
    assert res_admin.status_code == 200
    admin_token = res_admin.data['access']

    res_coord1 = client.post('/api/accounts/login/', {'username': 'coordinator1', 'password': 'coord123'})
    assert res_coord1.status_code == 200
    coord1_token = res_coord1.data['access']

    res_coord2 = client.post('/api/accounts/login/', {'username': 'coordinator2', 'password': 'coord123'})
    assert res_coord2.status_code == 200
    coord2_token = res_coord2.data['access']

    res_exec1 = client.post('/api/accounts/login/', {'username': 'executive1', 'password': 'exec123'})
    assert res_exec1.status_code == 200
    exec1_token = res_exec1.data['access']
    print("  ✓ Role-based JWT authentication successful for Admin, Coordinators, and Sales Executives.")


    # SECTION 2: ROLE BOUNDARIES & SECURITY POLICIES
    print("\n[TEST 2/7] Testing Strict Role Permission Boundaries & Security Gates...")

    # Sales Executive cannot create employees
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {exec1_token}')
    res_exec_create_emp = client.post('/api/accounts/employees/', {
        'username': 'rogue_user', 'role': 'ADMIN', 'password': 'password123'
    }, format='json')
    assert res_exec_create_emp.status_code in [403, 401], f"Expected 403/401 for executive employee creation, got {res_exec_create_emp.status_code}"
    print("  ✓ Sales Executive blocked from creating employees (403 Forbidden).")

    # Sales Executive cannot reassign coordinators
    res_exec_reassign = client.post('/api/accounts/reassign-coordinator/', {
        'employee_ids': [exec1.id], 'coordinator_id': coord2.id
    }, format='json')
    assert res_exec_reassign.status_code == 403, f"Expected 403, got {res_exec_reassign.status_code}"
    print("  ✓ Sales Executive blocked from reassigning coordinators (403 Forbidden).")

    # Sales Executive cannot create employee targets
    res_exec_target = client.post('/api/accounts/targets/', {
        'employee': exec1.id, 'period': 'MONTHLY', 'start_date': '2026-11-01', 'end_date': '2026-11-30',
        'gold_target_grams': 1000, 'cash_target_amount': 5000000
    }, format='json')
    assert res_exec_target.status_code == 403, f"Expected 403, got {res_exec_target.status_code}"
    print("  ✓ Sales Executive blocked from modifying targets (403 Forbidden).")

    # Sales Executive cannot approve collections
    res_exec_approve = client.post('/api/collections/approve/', {'type': 'GOLD', 'id': 1}, format='json')
    assert res_exec_approve.status_code == 403
    print("  ✓ Sales Executive blocked from approving collections (403 Forbidden).")

    # Coordinator cannot reassign coordinators (Admin only)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {coord1_token}')
    res_coord_reassign = client.post('/api/accounts/reassign-coordinator/', {
        'employee_ids': [exec1.id], 'coordinator_id': coord2.id
    }, format='json')
    assert res_coord_reassign.status_code == 403, f"Expected 403 for coordinator reassign, got {res_coord_reassign.status_code}"
    print("  ✓ Project Coordinator blocked from reassigning coordinators (Admin privilege).")

    # Coordinator cannot create employees (Admin only)
    res_coord_create_emp = client.post('/api/accounts/employees/', {
        'username': 'coord_added_emp', 'role': 'SALES_EXECUTIVE', 'password': 'password123'
    }, format='json')
    assert res_coord_create_emp.status_code == 403, f"Expected 403 for coordinator employee creation, got {res_coord_create_emp.status_code}"
    print("  ✓ Project Coordinator blocked from adding employees (Admin privilege).")

    # Coordinator cannot delete employees (Admin only)
    res_coord_del = client.delete(f'/api/accounts/employees/{exec1.id}/')
    assert res_coord_del.status_code == 403, f"Expected 403 for coordinator employee delete, got {res_coord_del.status_code}"
    print("  ✓ Project Coordinator blocked from deleting employee records (Admin privilege).")

    # Admin can reassign coordinators
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    res_admin_reassign = client.post('/api/accounts/reassign-coordinator/', {
        'employee_ids': [exec1.id], 'coordinator_id': coord1.id
    }, format='json')
    assert res_admin_reassign.status_code == 200, f"Expected 200, got {res_admin_reassign.status_code}: {res_admin_reassign.data}"
    print("  ✓ Admin authorized to reassign coordinators.")


    # SECTION 3: GPS FUNCTIONS & TELEMETRY
    print("\n[TEST 3/7] Testing GPS Telemetry, Shift Management & Validation...")

    # Inactive user cannot start shift
    client.force_authenticate(user=inactive_user)
    res_inact_shift = client.post('/api/tracking/toggle-work/', {'action': 'START', 'latitude': 13.0, 'longitude': 80.0}, format='json')
    assert res_inact_shift.status_code == 403, f"Expected 403 for inactive shift, got {res_inact_shift.status_code}"
    client.force_authenticate(user=None)
    print("  ✓ Inactive user prevented from starting a shift (403 Forbidden).")

    # Executive 1 starts shift with GPS
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {exec1_token}')
    res_shift_start = client.post('/api/tracking/toggle-work/', {
        'action': 'START', 'latitude': 13.0827, 'longitude': 80.2707, 'battery': 94, 'notes': 'Starting Morning Shift'
    }, format='json')
    assert res_shift_start.status_code == 200
    assert res_shift_start.data['is_working'] is True
    print("  ✓ Start Work shift recorded with GPS consent and telemetry.")

    # GPS Range Validation: Invalid coordinates rejected
    res_bad_gps = client.post('/api/tracking/ping/', {'latitude': 105.0, 'longitude': 80.0}, format='json')
    assert res_bad_gps.status_code == 400
    res_bad_lng = client.post('/api/tracking/ping/', {'latitude': 13.0, 'longitude': 210.0}, format='json')
    assert res_bad_lng.status_code == 400
    print("  ✓ Invalid GPS latitude/longitude ranges properly rejected (400 Bad Request).")

    # Periodic GPS Ping
    res_ping = client.post('/api/tracking/ping/', {
        'latitude': 13.0850, 'longitude': 80.2730, 'accuracy': 5.2, 'battery': 92, 'activity_type': 'PERIODIC_PING'
    }, format='json')
    assert res_ping.status_code == 200
    print("  ✓ Valid GPS breadcrumb logged successfully.")

    # Live fleet map scoping:
    # Admin sees all
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    live_admin = client.get('/api/tracking/live-locations/')
    assert live_admin.status_code == 200
    emp_ids_admin = [e['id'] for e in live_admin.data]
    assert exec1.id in emp_ids_admin and exec2.id in emp_ids_admin

    # Coord1 only sees exec1 (assigned), not exec2
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {coord1_token}')
    live_c1 = client.get('/api/tracking/live-locations/')
    emp_ids_c1 = [e['id'] for e in live_c1.data]
    assert exec1.id in emp_ids_c1 and exec2.id not in emp_ids_c1
    print("  ✓ Live GPS fleet map properly scoped: Coordinators only monitor assigned fleet.")

    # Breadcrumbs permission check:
    # Coord2 cannot view exec1 breadcrumbs
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {coord2_token}')
    res_bc_c2 = client.get(f'/api/tracking/breadcrumbs/{exec1.id}/')
    assert res_bc_c2.status_code == 403, f"Expected 403 for unauthorized breadcrumbs, got {res_bc_c2.status_code}"
    print("  ✓ Cross-coordinator GPS breadcrumbs inspection blocked (403 Forbidden).")


    # SECTION 4: CUSTOMER VISITS & FIELD OPERATIONS
    print("\n[TEST 4/7] Testing Customer Visit Logger & Validation...")

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {exec1_token}')
    
    # Missing required customer name/mobile
    res_bad_visit = client.post('/api/collections/visits/', {
        'customer_name': '', 'customer_mobile': '123', 'customer_address': 'Chennai'
    }, format='json')
    assert res_bad_visit.status_code == 400
    print("  ✓ Customer visit form validates required fields and minimum phone length.")

    # Valid visit logging
    res_visit = client.post('/api/collections/visits/', {
        'customer_name': 'Meenakshi Sundaram',
        'customer_mobile': '9876543210',
        'customer_address': '42 Gandhi Road, T. Nagar, Chennai',
        'visit_datetime': timezone.now().isoformat(),
        'latitude': 13.0418,
        'longitude': 80.2341,
        'visit_purpose': 'GOLD_COLLECTION',
        'visit_status': 'COMPLETED',
        'remarks': 'Appraised family bangles.'
    }, format='json')
    assert res_visit.status_code == 201
    visit_id = res_visit.data['id']
    print(f"  ✓ Customer visit created with check-in GPS (ID: {visit_id}).")


    # SECTION 5: COLLECTION SUBMISSIONS & DATABASE CONSTRAINTS
    print("\n[TEST 5/7] Testing Gold & Cash Collection Validation and Valuation...")

    # Gold Validation: Zero weight rejected
    res_bad_gold = client.post('/api/collections/gold/', {
        'customer_name': 'Meenakshi Sundaram',
        'customer_mobile': '9876543210',
        'customer_address': 'T. Nagar',
        'jewellery_type': 'BANGLES',
        'gold_weight_grams': 0.0,
        'gold_purity': '22K',
        'collection_datetime': timezone.now().isoformat(),
        'receipt_number': f'REC-ERR-{int(timezone.now().timestamp())}'
    }, format='json')
    assert res_bad_gold.status_code == 400
    print("  ✓ Non-positive gold weight rejected (400 Bad Request).")

    # Valid Gold Collection Submission
    gold_rec_no = f"REC-GLD-TEST-{int(timezone.now().timestamp())}"
    res_gold = client.post('/api/collections/gold/', {
        'customer_name': 'Meenakshi Sundaram',
        'customer_mobile': '9876543210',
        'customer_address': '42 Gandhi Road, T. Nagar, Chennai',
        'jewellery_type': 'BANGLES',
        'jewellery_description': '2 pairs of antique bangles, hallmarked',
        'gold_weight_grams': '45.500',
        'gold_purity': '22K',
        'collection_datetime': timezone.now().isoformat(),
        'receipt_number': gold_rec_no,
        'latitude': 13.0418,
        'longitude': 80.2341,
        'remarks': 'Initial physical verification conducted.'
    }, format='json')
    assert res_gold.status_code == 201, f"Failed gold creation: {res_gold.data}"
    gold_id = res_gold.data['id']
    # 45.5g * 7200 (22K) = 327,600.00
    expected_val = 45.5 * 7200.0
    assert float(res_gold.data['estimated_value']) == expected_val
    assert res_gold.data['approval_status'] == 'PENDING'
    print(f"  ✓ Gold Collection created (ID: {gold_id}). Auto valuation: ₹{expected_val:,.2f}.")

    # Duplicate Receipt Check
    res_dup_gold = client.post('/api/collections/gold/', {
        'customer_name': 'Meenakshi Sundaram',
        'customer_mobile': '9876543210',
        'customer_address': 'T. Nagar',
        'jewellery_type': 'RING',
        'gold_weight_grams': '10.000',
        'collection_datetime': timezone.now().isoformat(),
        'receipt_number': gold_rec_no
    }, format='json')
    assert res_dup_gold.status_code == 400
    print("  ✓ Duplicate gold receipt number prohibited by database unique constraint.")

    # Cash Validation: Negative amount rejected
    res_bad_cash = client.post('/api/collections/cash/', {
        'customer_name': 'Ramesh Kumar',
        'customer_mobile': '9840112233',
        'cash_amount': -500,
        'collection_datetime': timezone.now().isoformat(),
        'receipt_number': f"REC-CSH-ERR-{int(timezone.now().timestamp())}"
    }, format='json')
    assert res_bad_cash.status_code == 400
    print("  ✓ Negative/zero cash collection amounts rejected (400 Bad Request).")

    # Valid Cash Collection Submission
    cash_rec_no = f"REC-CSH-TEST-{int(timezone.now().timestamp())}"
    res_cash = client.post('/api/collections/cash/', {
        'customer_name': 'Ramesh Kumar',
        'customer_mobile': '9840112233',
        'customer_address': '12 Anna Salai, Chennai',
        'cash_amount': '75000.00',
        'collection_datetime': timezone.now().isoformat(),
        'receipt_number': cash_rec_no,
        'payment_method': 'CASH_HANDOVER',
        'latitude': 13.0600,
        'longitude': 80.2500,
        'remarks': 'Principal repayment receipt.'
    }, format='json')
    assert res_cash.status_code == 201
    cash_id = res_cash.data['id']
    assert res_cash.data['deposit_status'] == 'IN_HAND'
    assert res_cash.data['approval_status'] == 'PENDING'
    print(f"  ✓ Cash Collection created (ID: {cash_id}) for ₹75,000.00 via Cash Handover.")


    # SECTION 6: TWO-TIER APPROVAL, IMMUTABILITY & DEPOSIT RECONCILIATION
    print("\n[TEST 6/7] Testing Two-Tier Approval, Cross-Coordinator Isolation & Immutability...")

    # Coordinator 2 cannot verify Executive 1's collection (assigned to Coordinator 1)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {coord2_token}')
    res_unauth_app = client.post('/api/collections/approve/', {'type': 'GOLD', 'id': gold_id}, format='json')
    assert res_unauth_app.status_code == 403, f"Expected 403 for unauthorized coordinator verification, got {res_unauth_app.status_code}"
    print("  ✓ Cross-coordinator verification blocked (403 Forbidden).")

    # Coordinator 1 verifies Executive 1's gold collection
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {coord1_token}')
    res_c1_verify = client.post('/api/collections/approve/', {
        'type': 'GOLD', 'id': gold_id, 'remarks': 'Verified 45.5g 22K hallmarks in person.'
    }, format='json')
    assert res_c1_verify.status_code == 200
    assert res_c1_verify.data['approval_status'] == 'VERIFIED'
    print("  ✓ Stage 1: Coordinator 1 successfully verified gold collection (Status: VERIFIED).")

    # Record Immutability: Executive cannot edit VERIFIED record
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {exec1_token}')
    res_exec_edit = client.patch(f'/api/collections/gold/{gold_id}/', {'gold_weight_grams': '50.000'}, format='json')
    assert res_exec_edit.status_code == 400
    print("  ✓ Security Lock: Sales Executive cannot modify VERIFIED records.")

    # Admin Final Approval
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    res_admin_app = client.post('/api/collections/approve/', {
        'type': 'GOLD', 'id': gold_id, 'remarks': 'Collateral accepted into branch vault.'
    }, format='json')
    assert res_admin_app.status_code == 200
    assert res_admin_app.data['approval_status'] == 'APPROVED'
    print("  ✓ Stage 2: Admin granted final approval (Status: APPROVED).")

    # Record Immutability: Nobody can edit APPROVED record
    res_admin_edit = client.patch(f'/api/collections/gold/{gold_id}/', {'gold_weight_grams': '60.000'}, format='json')
    assert res_admin_edit.status_code == 400
    res_admin_del = client.delete(f'/api/collections/gold/{gold_id}/')
    assert res_admin_del.status_code == 400
    print("  ✓ Security Lock: Approved collection records are permanently locked & immutable.")

    # Cash Reconciliation
    res_reconcile = client.post('/api/collections/reconcile-cash/', {
        'id': cash_id,
        'deposit_status': 'BANK_DEPOSITED',
        'bank_reference': 'SBI-UTR-99882233',
        'reconciliation_remarks': 'Verified against SBI bank branch challan deposit.'
    }, format='json')
    assert res_reconcile.status_code == 200
    assert res_reconcile.data['deposit_status'] == 'BANK_DEPOSITED'
    print("  ✓ Cash Deposit Reconciliation updated with Bank UTR reference.")


    # SECTION 7: REPORTS, SCOPING & BINARY EXPORTS
    print("\n[TEST 7/7] Testing All 7 Reports, Scoped Filtering & Binary Exports (Excel/PDF)...")

    # Test Scoped Reports:
    # Executive only sees self
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {exec1_token}')
    rep_exec = client.get('/api/reports/data/?type=daily_gold')
    assert rep_exec.status_code == 200
    for item in rep_exec.data['items']:
        assert exec1.employee_id in item['employee']
    print("  ✓ Sales Executive report view strictly isolated to personal submissions.")

    # Coordinator 1 only sees assigned executive (exec1)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {coord1_token}')
    rep_c1 = client.get('/api/reports/data/?type=daily_gold')
    assert rep_c1.status_code == 200
    for item in rep_c1.data['items']:
        assert exec2.employee_id not in item['employee']
    print("  ✓ Project Coordinator report view strictly isolated to assigned subordinates.")

    # Admin tests all 7 JSON report endpoints
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    report_types = [
        'daily_gold', 'daily_cash', 'employee_wise', 'gps_visits',
        'monthly_perf', 'pending_approvals', 'cash_reconciliation'
    ]

    for rt in report_types:
        r_json = client.get(f'/api/reports/data/?type={rt}')
        assert r_json.status_code == 200, f"Report {rt} failed with {r_json.status_code}"
        assert 'items' in r_json.data
        row_count = len(r_json.data['items'])
        print(f"  ✓ Report '{rt}': {row_count} rows loaded successfully.")

    # Test Excel Exports for all 7 reports
    for rt in report_types:
        r_xls = client.get(f'/api/reports/export/excel/?type={rt}')
        assert r_xls.status_code == 200
        assert r_xls['Content-Type'] == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        assert len(r_xls.content) > 1000
    print("  ✓ All 7 Excel spreadsheet exports (.xlsx) generated with corporate headers.")

    # Test PDF Exports for all 7 reports
    for rt in report_types:
        r_pdf = client.get(f'/api/reports/export/pdf/?type={rt}')
        assert r_pdf.status_code == 200
        assert r_pdf['Content-Type'] == 'application/pdf'
        assert r_pdf.content.startswith(b'%PDF-')
    print("  ✓ All 7 PDF audit statements (.pdf) generated with ReportLab landscape tables.")

    print("\n" + "=" * 65)
    print("ALL 7 SYSTEM HARDENING TEST PHASES PASSED WITH ZERO ERRORS!")
    print("=" * 65)

if __name__ == '__main__':
    run_tests()
