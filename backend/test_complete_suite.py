import os
import django
import json
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gold_tracker.settings')
django.setup()

from rest_framework.test import APIClient
from accounts.models import User
from finance_collections.models import GoldCollection, CashCollection

def run_suite():
    client = APIClient()
    print("=" * 60)
    print("GOLD FINANCE - COMPLETE SYSTEM VERIFICATION TEST SUITE")
    print("=" * 60)

    # 1. Login checks for all 3 roles
    print("\n[1/10] Verifying Role-Based Authentication...")
    for role_name, username, pwd in [('ADMIN', 'admin', 'admin123'),
                                     ('COORDINATOR', 'coordinator1', 'coord123'),
                                     ('SALES_EXECUTIVE', 'executive1', 'exec123')]:
        r = client.post('/api/accounts/login/', {'username': username, 'password': pwd}, format='json')
        assert r.status_code == 200, f"Login failed for {role_name}: {r.content}"
        assert r.data['user']['role'] == role_name
        print(f"  ✓ {role_name} ({username}) authenticated successfully.")

    # 2. Sales Executive Shift Toggle
    print("\n[2/10] Testing Sales Executive Start Work Shift with GPS Telemetry...")
    exec1 = User.objects.get(username='executive1')
    client.force_authenticate(user=exec1)

    r = client.post('/api/tracking/toggle-work/', {
        'action': 'START',
        'latitude': 13.0450,
        'longitude': 80.2380,
        'notes': 'Starting field collections in T. Nagar zone',
        'battery': 92
    }, format='json')
    assert r.status_code == 200
    exec1.refresh_from_db()
    assert exec1.is_working is True
    print(f"  ✓ Work shift active. Current Coords: ({exec1.current_latitude}, {exec1.current_longitude})")

    # 3. Log Customer Visit
    print("\n[3/10] Testing Customer Visit Logging with GPS...")
    r = client.post('/api/collections/visits/', {
        'customer_name': 'K. S. Narayanan',
        'customer_mobile': '+91 98401 22334',
        'customer_address': 'Flat 3B, Temple View Apartments, Mylapore, Chennai',
        'visit_datetime': '2026-11-19T11:00:00Z',
        'latitude': 13.0330,
        'longitude': 80.2680,
        'visit_purpose': 'GOLD_COLLECTION',
        'visit_status': 'COMPLETED',
        'remarks': 'Appraisal of gold bangles for immediate loan sanction.'
    }, format='json')
    assert r.status_code == 201
    visit_id = r.data['id']
    print(f"  ✓ Customer visit created successfully (ID: {visit_id}).")

    # 4. Submit Gold Collection
    print("\n[4/10] Testing Gold Collection Submission & Valuation...")
    receipt_g = 'GLD-TEST-9901'
    r = client.post('/api/collections/gold/', {
        'customer_name': 'K. S. Narayanan',
        'customer_mobile': '+91 98401 22334',
        'customer_address': 'Flat 3B, Temple View Apartments, Mylapore, Chennai',
        'jewellery_type': 'BANGLES',
        'jewellery_description': '2 pairs solid 916 hallmarked bangles',
        'gold_weight_grams': '36.800',
        'gold_purity': '22K',
        'collection_datetime': '2026-11-19T11:15:00Z',
        'receipt_number': receipt_g,
        'latitude': 13.0330,
        'longitude': 80.2680,
        'remarks': 'Spot acid test and ultrasonic density verified.'
    }, format='json')
    assert r.status_code == 201
    gold_id = r.data['id']
    est_val = r.data['estimated_value']
    print(f"  ✓ Gold Collection created (ID: {gold_id}). Net: 36.8g 22K. Auto Valuation: ₹{est_val}")

    # 5. Duplicate Receipt Number Prevention
    print("\n[5/10] Testing Duplicate Receipt Number Rejection...")
    r_dup = client.post('/api/collections/gold/', {
        'customer_name': 'Another Customer',
        'customer_mobile': '+91 99999 88888',
        'customer_address': 'Address',
        'jewellery_type': 'RING',
        'gold_weight_grams': '10.000',
        'gold_purity': '22K',
        'collection_datetime': '2026-11-19T11:20:00Z',
        'receipt_number': receipt_g, # Duplicate!
    }, format='json')
    assert r_dup.status_code == 400
    print("  ✓ Duplicate receipt successfully rejected by validation constraint.")

    # 6. Submit Cash Collection
    print("\n[6/10] Testing Cash Collection Submission...")
    receipt_c = 'CSH-TEST-9901'
    r = client.post('/api/collections/cash/', {
        'customer_name': 'Sangeetha R.',
        'customer_mobile': '+91 98840 99887',
        'customer_address': '18, Cathedral Road, Chennai',
        'cash_amount': '65000.00',
        'receipt_number': receipt_c,
        'collection_datetime': '2026-11-19T11:30:00Z',
        'payment_method': 'CASH_HANDOVER',
        'latitude': 13.0455,
        'longitude': 80.2450,
        'remarks': 'Monthly interest payment in 500-rupee currency notes.'
    }, format='json')
    assert r.status_code == 201
    cash_id = r.data['id']
    print(f"  ✓ Cash Collection created (ID: {cash_id}) for ₹65,000.00 via Cash Handover.")

    # 7. Verification by Project Coordinator
    print("\n[7/10] Testing Multi-Stage Approval: Coordinator Verification...")
    coord = User.objects.get(username='coordinator1')
    client.force_authenticate(user=coord)

    r = client.post('/api/collections/approve/', {'type': 'GOLD', 'id': gold_id, 'remarks': 'Verified weight & hallmarks'})
    assert r.status_code == 200
    assert r.data['approval_status'] == 'VERIFIED'

    r = client.post('/api/collections/approve/', {'type': 'CASH', 'id': cash_id, 'remarks': 'Verified cash handover count'})
    assert r.status_code == 200
    assert r.data['approval_status'] == 'VERIFIED'
    print("  ✓ Project Coordinator successfully verified Gold and Cash submissions.")

    # 8. Final Approval by Admin
    print("\n[8/10] Testing Admin Final Approval & Vault Booking...")
    admin = User.objects.get(username='admin')
    client.force_authenticate(user=admin)

    r = client.post('/api/collections/approve/', {'type': 'GOLD', 'id': gold_id, 'remarks': 'Transferred to secure vault'})
    assert r.status_code == 200
    assert r.data['approval_status'] == 'APPROVED'

    r = client.post('/api/collections/approve/', {'type': 'CASH', 'id': cash_id, 'remarks': 'Audited & booked into ledger'})
    assert r.status_code == 200
    assert r.data['approval_status'] == 'APPROVED'
    print("  ✓ Admin finalized approval into master collateral ledger.")

    # Reconcile Cash Deposit
    r = client.post('/api/collections/reconcile-cash/', {
        'id': cash_id,
        'deposit_status': 'BANK_DEPOSITED',
        'bank_reference': 'HDFC-UTR-773829104',
        'reconciliation_remarks': 'Bank teller receipt verified'
    })
    assert r.status_code == 200
    print("  ✓ Cash Deposit reconciled to BANK_DEPOSITED with UTR reference.")

    # 9. Test Lock on Approved Records (Security requirement)
    print("\n[9/10] Testing Security Policy: Forbid Editing Approved Records...")
    client.force_authenticate(user=exec1)
    r_edit = client.patch(f'/api/collections/gold/{gold_id}/', {'gold_weight_grams': '10.000'})
    assert r_edit.status_code == 400
    print("  ✓ Security Lock verified: Approved records are immutable and cannot be tampered with.")

    # 10. Generate Reports and Exports
    print("\n[10/10] Testing All 7 Report Types and Binary Exports (Excel & PDF)...")
    client.force_authenticate(user=admin)
    report_types = [
        'daily_gold', 'daily_cash', 'employee_wise', 'gps_visits',
        'monthly_perf', 'pending_approvals', 'cash_reconciliation'
    ]
    for rep in report_types:
        r_rep = client.get(f'/api/reports/data/?type={rep}')
        assert r_rep.status_code == 200
        print(f"  ✓ Report '{rep}': {len(r_rep.data.get('items', []))} rows generated.")

    r_xlsx = client.get('/api/reports/export/excel/?type=daily_gold')
    assert r_xlsx.status_code == 200
    assert len(r_xlsx.content) > 1000
    print(f"  ✓ Excel Export (.xlsx) generated: {len(r_xlsx.content)} bytes.")

    r_pdf = client.get('/api/reports/export/pdf/?type=daily_gold')
    assert r_pdf.status_code == 200
    assert len(r_pdf.content) > 1000
    print(f"  ✓ PDF Export (.pdf) generated: {len(r_pdf.content)} bytes.")

    # Clean up test records
    GoldCollection.objects.filter(receipt_number=receipt_g).delete()
    CashCollection.objects.filter(receipt_number=receipt_c).delete()

    print("\n" + "=" * 60)
    print("ALL 10/10 MODULE VERIFICATION TESTS PASSED WITH ZERO ERRORS!")
    print("=" * 60)

if __name__ == '__main__':
    run_suite()

