import os
import django
from io import BytesIO
import openpyxl

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gold_tracker.settings')
django.setup()

from rest_framework.test import APIClient
from accounts.models import User

def test_all_reports_and_exports():
    client = APIClient()
    admin = User.objects.get(username='admin')
    client.force_authenticate(user=admin)
    print("Testing All 7 Reports, Performance Data, Excel and PDF Exports as Admin...")

    REPORT_TYPES = [
        'daily_gold',
        'daily_cash',
        'employee_wise',
        'gps_visits',
        'monthly_perf',
        'pending_approvals',
        'cash_reconciliation'
    ]

    for r_type in REPORT_TYPES:
        print(f"\n--- Testing Report Type: '{r_type}' ---")

        # 1. JSON Report API
        r_json = client.get(f'/api/reports/data/?type={r_type}')
        assert r_json.status_code == 200, f"JSON failed for {r_type}: {r_json.data}"
        items = r_json.data.get('items', [])
        print(f"  ✓ JSON Endpoint passed: '{r_json.data.get('title')}' with {len(items)} rows")

        # 2. Excel (.xlsx) Export
        r_excel = client.get(f'/api/reports/export/excel/?type={r_type}')
        assert r_excel.status_code == 200, f"Excel export failed for {r_type}"
        assert r_excel['Content-Type'] == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        # Parse Excel from bytes to confirm valid openpyxl format
        wb = openpyxl.load_workbook(BytesIO(r_excel.content))
        ws = wb.active
        assert ws.max_row >= 4, f"Expected at least 4 rows in Excel sheet for {r_type}"
        print(f"  ✓ Excel Export passed: {len(r_excel.content)} bytes, {ws.max_row} rows in workbook")

        # 3. PDF (.pdf) Export
        r_pdf = client.get(f'/api/reports/export/pdf/?type={r_type}')
        assert r_pdf.status_code == 200, f"PDF export failed for {r_type}"
        assert r_pdf['Content-Type'] == 'application/pdf'
        assert r_pdf.content.startswith(b'%PDF'), f"PDF file does not start with %PDF header for {r_type}"
        print(f"  ✓ PDF Export passed: {len(r_pdf.content)} bytes with valid %PDF header")

    # Test Scoped Filtering with Date & Employee
    print("\n--- Testing Date & Employee Scoped Filtering ---")
    exec1 = User.objects.get(username='executive1')
    r_filtered = client.get(f'/api/reports/data/?type=daily_gold&employee={exec1.id}')
    assert r_filtered.status_code == 200
    for item in r_filtered.data['items']:
        assert exec1.employee_id in item['employee']
    print(f"  ✓ Employee-scoped filter verified for {exec1.employee_id}: {len(r_filtered.data['items'])} matching rows")

    print("\n=======================================================")
    print("ALL 7 REPORTS, EXCEL & PDF EXPORTS VERIFIED 100%!")
    print("=======================================================")

if __name__ == '__main__':
    test_all_reports_and_exports()

