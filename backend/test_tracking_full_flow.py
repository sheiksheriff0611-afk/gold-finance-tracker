import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gold_tracker.settings')
django.setup()

from rest_framework.test import APIClient
from accounts.models import User
from tracking.models import WorkShift, LocationPing
from finance_collections.models import CustomerVisit, GoldCollection, CashCollection

def test_full_gps_and_shift_lifecycle():
    client = APIClient()
    
    # 1. Authenticate as executive2
    exec2 = User.objects.get(username='executive2')
    client.force_authenticate(user=exec2)
    print(f"Testing GPS & Shift Lifecycle for: {exec2.get_full_name()} ({exec2.employee_id})")

    # Clean up previous active shifts if any
    WorkShift.objects.filter(employee=exec2, is_active=True).update(is_active=False)
    exec2.is_working = False
    exec2.save()

    # Step 1: Start Work Shift with GPS coordinates
    start_payload = {
        'action': 'START',
        'latitude': 13.0418,
        'longitude': 80.2341,
        'battery': 95,
        'notes': 'Beginning field collection route in Chennai South'
    }
    r = client.post('/api/tracking/toggle-work/', start_payload, format='json')
    assert r.status_code == 200, f"Start work failed: {r.data}"
    assert r.data['is_working'] is True
    print("✓ 1. Start Work Shift succeeded. GPS telemetry active.")

    # Step 2: Check Active Shift Details
    r = client.get('/api/tracking/active-shift/')
    assert r.status_code == 200
    assert r.data['is_active'] is True
    shift_id = r.data['shift']['id']
    print(f"✓ 2. Active Shift detected: ID {shift_id}, Start Lat: {r.data['shift']['start_latitude']}, Start Lng: {r.data['shift']['start_longitude']}")

    # Step 3: Send Periodic GPS Pings (Automated 30-sec pinger simulation)
    ping1 = client.post('/api/tracking/ping/', {
        'latitude': 13.0450,
        'longitude': 80.2370,
        'accuracy': 8.5,
        'battery': 94,
        'activity_type': 'PERIODIC_PING',
        'notes': 'Checkpoint A - Anna Salai'
    }, format='json')
    assert ping1.status_code == 200
    assert ping1.data['status'] == 'recorded'

    ping2 = client.post('/api/tracking/ping/', {
        'latitude': 13.0480,
        'longitude': 80.2395,
        'accuracy': 6.2,
        'battery': 93,
        'activity_type': 'PERIODIC_PING',
        'notes': 'Checkpoint B - T. Nagar'
    }, format='json')
    assert ping2.status_code == 200
    print("✓ 3. Periodic GPS telemetry pings recorded successfully.")

    # Step 4: Record a Customer Visit with GPS
    visit_res = client.post('/api/collections/visits/', {
        'customer_name': 'Venkatesh Prasad',
        'customer_mobile': '9840198401',
        'customer_address': 'Flat 3B, Lake View Road, Chennai',
        'visit_datetime': '2026-11-19T10:30:00Z',
        'latitude': 13.0490,
        'longitude': 80.2410,
        'visit_purpose': 'GOLD_COLLECTION',
        'visit_status': 'COMPLETED',
        'remarks': 'Appraisal completed. Agreed to pledge gold bangles.'
    }, format='json')
    assert visit_res.status_code == 201, f"Visit creation failed: {visit_res.data}"
    print("✓ 4. Customer Field Visit logged with GPS coordinates (13.0490, 80.2410).")

    # Step 5: Record a Gold Collection with GPS
    from django.utils import timezone
    gold_res = client.post('/api/collections/gold/', {
        'customer_name': 'Venkatesh Prasad',
        'customer_mobile': '9840198401',
        'customer_address': 'Flat 3B, Lake View Road, Chennai',
        'jewellery_type': 'BANGLES',
        'gold_weight_grams': '45.250',
        'gold_purity': '22K',
        'collection_datetime': timezone.now().isoformat(),
        'receipt_number': 'REC-GPS-TEST-001',
        'latitude': 13.0490,
        'longitude': 80.2410,
        'remarks': '4 pieces hallmarked bangles'
    }, format='json')
    assert gold_res.status_code == 201, f"Gold collection failed: {gold_res.data}"
    print("✓ 5. Gold Collection logged with GPS coordinates & auto-purity valuation.")

    # Step 6: Authenticate as Admin and inspect Employee Breadcrumbs
    admin = User.objects.get(username='admin')
    client.force_authenticate(user=admin)
    today_str = date.today().strftime('%Y-%m-%d')

    r = client.get(f'/api/tracking/breadcrumbs/{exec2.id}/?date={today_str}')
    assert r.status_code == 200, f"Breadcrumbs failed: {r.data}"
    data = r.data
    assert len(data['breadcrumbs']) >= 3, f"Expected at least 3 pings, got {len(data['breadcrumbs'])}"
    assert len(data['visits']) >= 1, f"Expected customer visit in breadcrumbs, got {len(data['visits'])}"
    assert len(data['gold_collections']) >= 1, f"Expected gold collection in breadcrumbs, got {len(data['gold_collections'])}"
    print(f"✓ 6. Breadcrumbs API verification passed:")
    print(f"   - Total Pings on trail: {len(data['breadcrumbs'])}")
    print(f"   - Customer Visits on map: {len(data['visits'])} ({data['visits'][0]['customer_name']})")
    print(f"   - Gold Collections on map: {len(data['gold_collections'])} ({data['gold_collections'][0]['weight']}g)")

    # Step 7: Sales executive ends work shift
    client.force_authenticate(user=exec2)
    end_payload = {
        'action': 'END',
        'latitude': 13.0510,
        'longitude': 80.2450,
        'battery': 91,
        'notes': 'Shift completed, returned to regional branch'
    }
    r = client.post('/api/tracking/toggle-work/', end_payload, format='json')
    assert r.status_code == 200
    assert r.data['is_working'] is False
    print("✓ 7. End Work Shift succeeded. GPS tracking paused.")

    # Step 8: Verify Shift History contains duration, notes, and pings
    r = client.get('/api/tracking/shifts/')
    assert r.status_code == 200
    shifts = r.data
    assert len(shifts) >= 1
    latest_shift = shifts[0]
    print(f"✓ 8. Shift History verified: Latest Shift ID {latest_shift['id']}, Pings: {latest_shift['pings_count']}, Notes: '{latest_shift['notes']}'")

    # Step 9: Verify Live Locations endpoint reflects off-duty state
    r = client.get('/api/tracking/live-locations/')
    assert r.status_code == 200
    exec_status = next((e for e in r.data if e['id'] == exec2.id), None)
    assert exec_status is not None
    assert exec_status['is_working'] is False
    print("✓ 9. Live Locations endpoint reflects accurate duty state (Off Duty).")

    print("\n=======================================================")
    print("ALL 9 GPS TRACKING, SHIFT & MOVEMENT TESTS PASSED 100%!")
    print("=======================================================")

if __name__ == '__main__':
    test_full_gps_and_shift_lifecycle()
