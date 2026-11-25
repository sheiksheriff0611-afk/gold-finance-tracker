import io
from datetime import datetime, date
from decimal import Decimal
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.http import HttpResponse

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from accounts.models import User, EmployeeTarget
from tracking.models import LocationPing, WorkShift
from finance_collections.models import CustomerVisit, GoldCollection, CashCollection


def get_scoped_data(user, filter_emp_id=None, start_date=None, end_date=None):
    gold_qs = GoldCollection.objects.all().select_related('employee', 'verified_by_coordinator', 'approved_by_admin')
    cash_qs = CashCollection.objects.all().select_related('employee', 'verified_by_coordinator', 'approved_by_admin')
    visit_qs = CustomerVisit.objects.all().select_related('employee')
    emp_qs = User.objects.filter(role='SALES_EXECUTIVE')

    if user.role == 'ADMIN' or user.is_superuser:
        pass
    elif user.role == 'COORDINATOR':
        emp_qs = emp_qs.filter(assigned_coordinator=user)
        assigned_ids = list(emp_qs.values_list('id', flat=True))
        gold_qs = gold_qs.filter(employee_id__in=assigned_ids)
        cash_qs = cash_qs.filter(employee_id__in=assigned_ids)
        visit_qs = visit_qs.filter(employee_id__in=assigned_ids)
    else: # SALES_EXECUTIVE
        emp_qs = emp_qs.filter(id=user.id)
        gold_qs = gold_qs.filter(employee=user)
        cash_qs = cash_qs.filter(employee=user)
        visit_qs = visit_qs.filter(employee=user)

    if filter_emp_id:
        if str(filter_emp_id).isdigit():
            emp_match = User.objects.filter(id=int(filter_emp_id)).first()
        else:
            emp_match = User.objects.filter(employee_id=filter_emp_id).first()

        target_pk = emp_match.id if emp_match else -1
        gold_qs = gold_qs.filter(employee_id=target_pk)
        cash_qs = cash_qs.filter(employee_id=target_pk)
        visit_qs = visit_qs.filter(employee_id=target_pk)
        emp_qs = emp_qs.filter(id=target_pk)

    if start_date:
        gold_qs = gold_qs.filter(collection_datetime__date__gte=start_date)
        cash_qs = cash_qs.filter(collection_datetime__date__gte=start_date)
        visit_qs = visit_qs.filter(visit_datetime__date__gte=start_date)

    if end_date:
        gold_qs = gold_qs.filter(collection_datetime__date__lte=end_date)
        cash_qs = cash_qs.filter(collection_datetime__date__lte=end_date)
        visit_qs = visit_qs.filter(visit_datetime__date__lte=end_date)

    return gold_qs, cash_qs, visit_qs, emp_qs


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_data_view(request):
    """
    JSON API for interactive reports in frontend.
    Supported report_type:
    - 'daily_gold'
    - 'daily_cash'
    - 'employee_wise'
    - 'gps_visits'
    - 'monthly_perf'
    - 'pending_approvals'
    - 'cash_reconciliation'
    """
    report_type = request.query_params.get('type', 'daily_gold')
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')
    emp_id = request.query_params.get('employee')

    start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
    end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None

    gold_qs, cash_qs, visit_qs, emp_qs = get_scoped_data(request.user, emp_id, start_date, end_date)

    if report_type == 'daily_gold':
        items = []
        for g in gold_qs.order_by('-collection_datetime'):
            items.append({
                'receipt_number': g.receipt_number,
                'date': g.collection_datetime.strftime('%Y-%m-%d %H:%M'),
                'employee': f"{g.employee.employee_id} - {g.employee.get_full_name() or g.employee.username}",
                'customer': g.customer_name,
                'mobile': g.customer_mobile,
                'jewellery_type': g.get_jewellery_type_display(),
                'weight_grams': float(g.gold_weight_grams),
                'purity': g.gold_purity,
                'estimated_value': float(g.estimated_value),
                'status': g.get_approval_status_display(),
            })
        total_weight = sum(item['weight_grams'] for item in items)
        total_val = sum(item['estimated_value'] for item in items)
        return Response({'title': 'Daily Gold Collection Report', 'items': items, 'totals': {'weight_grams': round(total_weight, 3), 'value': total_val}})

    elif report_type == 'daily_cash':
        items = []
        for c in cash_qs.order_by('-collection_datetime'):
            items.append({
                'receipt_number': c.receipt_number,
                'date': c.collection_datetime.strftime('%Y-%m-%d %H:%M'),
                'employee': f"{c.employee.employee_id} - {c.employee.get_full_name() or c.employee.username}",
                'customer': c.customer_name,
                'mobile': c.customer_mobile,
                'amount': float(c.cash_amount),
                'payment_method': c.get_payment_method_display(),
                'status': c.get_approval_status_display(),
                'deposit_status': c.get_deposit_status_display(),
            })
        total_cash = sum(item['amount'] for item in items)
        return Response({'title': 'Daily Cash Collection Report', 'items': items, 'totals': {'amount': total_cash}})

    elif report_type == 'employee_wise':
        items = []
        for emp in emp_qs:
            emp_gold = gold_qs.filter(employee=emp)
            emp_cash = cash_qs.filter(employee=emp)
            emp_visits = visit_qs.filter(employee=emp)
            
            gold_g = float(emp_gold.filter(approval_status__in=['APPROVED', 'VERIFIED']).aggregate(tot=Sum('gold_weight_grams'))['tot'] or 0.0)
            cash_a = float(emp_cash.filter(approval_status__in=['APPROVED', 'VERIFIED']).aggregate(tot=Sum('cash_amount'))['tot'] or 0.0)
            visits_c = emp_visits.count()

            items.append({
                'employee_id': emp.employee_id,
                'name': emp.get_full_name() or emp.username,
                'phone': emp.phone,
                'coordinator': emp.assigned_coordinator.get_full_name() if emp.assigned_coordinator else 'Unassigned',
                'gold_grams': round(gold_g, 3),
                'cash_amount': cash_a,
                'total_visits': visits_c,
                'active_status': 'Working Now' if emp.is_working else 'Offline'
            })
        return Response({'title': 'Employee-wise Collection Report', 'items': items})

    elif report_type == 'gps_visits':
        items = []
        for v in visit_qs.order_by('-visit_datetime'):
            items.append({
                'id': v.id,
                'employee': f"{v.employee.employee_id} - {v.employee.get_full_name() or v.employee.username}",
                'customer_name': v.customer_name,
                'customer_mobile': v.customer_mobile,
                'customer_address': v.customer_address,
                'visit_datetime': v.visit_datetime.strftime('%Y-%m-%d %H:%M'),
                'purpose': v.get_visit_purpose_display(),
                'status': v.get_visit_status_display(),
                'latitude': v.latitude,
                'longitude': v.longitude,
                'remarks': v.remarks,
            })
        return Response({'title': 'GPS Visit History Report', 'items': items})

    elif report_type == 'monthly_perf':
        today = timezone.localdate()
        m_start = start_date or today.replace(day=1)
        items = []
        for emp in emp_qs:
            target = EmployeeTarget.objects.filter(employee=emp, start_date__lte=today, end_date__gte=today).first()
            g_ach = float(gold_qs.filter(employee=emp, approval_status__in=['APPROVED', 'VERIFIED']).aggregate(tot=Sum('gold_weight_grams'))['tot'] or 0.0)
            c_ach = float(cash_qs.filter(employee=emp, approval_status__in=['APPROVED', 'VERIFIED']).aggregate(tot=Sum('cash_amount'))['tot'] or 0.0)

            g_tgt = float(target.gold_target_grams) if target else 100.0
            c_tgt = float(target.cash_target_amount) if target else 500000.0

            g_pct = round((g_ach / g_tgt) * 100, 1) if g_tgt > 0 else 0
            c_pct = round((c_ach / c_tgt) * 100, 1) if c_tgt > 0 else 0
            ov_pct = round((g_pct + c_pct) / 2, 1)

            items.append({
                'employee_id': emp.employee_id,
                'name': emp.get_full_name() or emp.username,
                'gold_target': g_tgt,
                'gold_achieved': round(g_ach, 3),
                'gold_percentage': g_pct,
                'cash_target': c_tgt,
                'cash_achieved': c_ach,
                'cash_percentage': c_pct,
                'overall_percentage': ov_pct,
            })
        return Response({'title': 'Monthly Performance Report', 'items': items})

    elif report_type == 'pending_approvals':
        items = []
        for g in gold_qs.filter(approval_status='PENDING').order_by('-collection_datetime'):
            items.append({
                'type': 'GOLD',
                'receipt_number': g.receipt_number,
                'date': g.collection_datetime.strftime('%Y-%m-%d %H:%M'),
                'employee': f"{g.employee.employee_id} - {g.employee.get_full_name() or g.employee.username}",
                'customer': g.customer_name,
                'item_summary': f"{g.gold_weight_grams}g ({g.gold_purity}) - {g.get_jewellery_type_display()}",
                'amount_or_value': float(g.estimated_value),
                'status': 'Pending Verification',
            })
        for c in cash_qs.filter(approval_status='PENDING').order_by('-collection_datetime'):
            items.append({
                'type': 'CASH',
                'receipt_number': c.receipt_number,
                'date': c.collection_datetime.strftime('%Y-%m-%d %H:%M'),
                'employee': f"{c.employee.employee_id} - {c.employee.get_full_name() or c.employee.username}",
                'customer': c.customer_name,
                'item_summary': f"Cash via {c.get_payment_method_display()}",
                'amount_or_value': float(c.cash_amount),
                'status': 'Pending Verification',
            })
        return Response({'title': 'Pending Approval Report', 'items': items})

    elif report_type == 'cash_reconciliation':
        items = []
        for c in cash_qs.order_by('-collection_datetime'):
            items.append({
                'receipt_number': c.receipt_number,
                'date': c.collection_datetime.strftime('%Y-%m-%d %H:%M'),
                'employee': f"{c.employee.employee_id} - {c.employee.get_full_name() or c.employee.username}",
                'customer': c.customer_name,
                'amount': float(c.cash_amount),
                'payment_method': c.get_payment_method_display(),
                'deposit_status': c.get_deposit_status_display(),
                'bank_reference': c.bank_reference or '—',
                'reconciled_by': c.reconciled_by.get_full_name() if c.reconciled_by else '—',
                'deposit_date': c.deposit_date.strftime('%Y-%m-%d') if c.deposit_date else '—',
            })
        return Response({'title': 'Cash Deposit Reconciliation Report', 'items': items})

    return Response({'error': 'Unknown report type.'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_excel_view(request):
    """
    Exports clean professional Excel spreadsheet styled with Gold Finance branding.
    """
    report_type = request.query_params.get('type', 'daily_gold')
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')
    emp_id = request.query_params.get('employee')

    start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
    end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None

    gold_qs, cash_qs, visit_qs, emp_qs = get_scoped_data(request.user, emp_id, start_date, end_date)

    wb = openpyxl.Workbook()
    ws = wb.active

    # Brand Header
    ws.merge_cells('A1:G1')
    ws['A1'] = "GOLD FINANCE – EMPLOYEE TRACKER & COLLECTION MANAGEMENT SYSTEM"
    ws['A1'].font = Font(name='Arial', size=14, bold=True, color='FFFFFF')
    ws['A1'].fill = PatternFill(start_color='0B1329', end_color='0B1329', fill_type='solid')
    ws['A1'].alignment = Alignment(horizontal='center', vertical='center')

    # Subtitle
    ws.merge_cells('A2:G2')
    ws['A2'] = f"Report: {report_type.upper().replace('_', ' ')} | Generated on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}"
    ws['A2'].font = Font(name='Arial', size=10, italic=True, color='D4AF37')
    ws['A2'].fill = PatternFill(start_color='111E3F', end_color='111E3F', fill_type='solid')
    ws['A2'].alignment = Alignment(horizontal='center', vertical='center')

    header_font = Font(name='Arial', size=11, bold=True, color='FFFFFF')
    header_fill = PatternFill(start_color='1A2C5B', end_color='1A2C5B', fill_type='solid')

    row_num = 4
    if report_type == 'daily_gold':
        headers = ['Receipt No', 'Date & Time', 'Employee', 'Customer', 'Mobile', 'Jewellery Type', 'Purity', 'Weight (g)', 'Est Value (₹)', 'Status']
        ws.append(headers)
        total_w = 0
        total_v = 0
        for g in gold_qs.order_by('-collection_datetime'):
            w = float(g.gold_weight_grams)
            v = float(g.estimated_value)
            total_w += w
            total_v += v
            ws.append([
                g.receipt_number,
                g.collection_datetime.strftime('%Y-%m-%d %H:%M'),
                f"{g.employee.employee_id} - {g.employee.get_full_name() or g.employee.username}",
                g.customer_name,
                g.customer_mobile,
                g.get_jewellery_type_display(),
                g.gold_purity,
                w,
                v,
                g.get_approval_status_display()
            ])
        ws.append(['TOTALS', '', '', '', '', '', '', round(total_w, 3), round(total_v, 2), ''])

    elif report_type == 'daily_cash':
        headers = ['Receipt No', 'Date & Time', 'Employee', 'Customer', 'Mobile', 'Cash Amount (₹)', 'Payment Method', 'Approval Status', 'Deposit Status']
        ws.append(headers)
        total_c = 0
        for c in cash_qs.order_by('-collection_datetime'):
            amt = float(c.cash_amount)
            total_c += amt
            ws.append([
                c.receipt_number,
                c.collection_datetime.strftime('%Y-%m-%d %H:%M'),
                f"{c.employee.employee_id} - {c.employee.get_full_name() or c.employee.username}",
                c.customer_name,
                c.customer_mobile,
                amt,
                c.get_payment_method_display(),
                c.get_approval_status_display(),
                c.get_deposit_status_display()
            ])
        ws.append(['TOTALS', '', '', '', '', round(total_c, 2), '', '', ''])

    elif report_type == 'employee_wise':
        headers = ['Employee Code', 'Full Name', 'Phone', 'Coordinator', 'Gold Collected (g)', 'Cash Collected (₹)', 'Total Visits', 'Duty Status']
        ws.append(headers)
        for emp in emp_qs:
            emp_gold = gold_qs.filter(employee=emp)
            emp_cash = cash_qs.filter(employee=emp)
            emp_visits = visit_qs.filter(employee=emp)
            gold_g = float(emp_gold.filter(approval_status__in=['APPROVED', 'VERIFIED']).aggregate(tot=Sum('gold_weight_grams'))['tot'] or 0.0)
            cash_a = float(emp_cash.filter(approval_status__in=['APPROVED', 'VERIFIED']).aggregate(tot=Sum('cash_amount'))['tot'] or 0.0)
            ws.append([
                emp.employee_id,
                emp.get_full_name() or emp.username,
                emp.phone or '—',
                emp.assigned_coordinator.get_full_name() if emp.assigned_coordinator else 'Unassigned',
                round(gold_g, 3),
                round(cash_a, 2),
                emp_visits.count(),
                'Working Now' if emp.is_working else 'Offline'
            ])

    elif report_type == 'gps_visits':
        headers = ['Visit ID', 'Date & Time', 'Employee', 'Customer', 'Mobile', 'Customer Address', 'Purpose', 'Status', 'GPS Coordinates', 'Remarks']
        ws.append(headers)
        for v in visit_qs.order_by('-visit_datetime'):
            coords = f"{v.latitude:.4f}, {v.longitude:.4f}" if (v.latitude and v.longitude) else 'No GPS'
            ws.append([
                f"VIS-{v.id:04d}",
                v.visit_datetime.strftime('%Y-%m-%d %H:%M'),
                f"{v.employee.employee_id} - {v.employee.get_full_name() or v.employee.username}",
                v.customer_name,
                v.customer_mobile,
                v.customer_address,
                v.get_visit_purpose_display(),
                v.get_visit_status_display(),
                coords,
                v.remarks or '—'
            ])

    elif report_type == 'monthly_perf':
        headers = ['Employee ID', 'Full Name', 'Gold Target (g)', 'Gold Achieved (g)', 'Gold %', 'Cash Target (₹)', 'Cash Achieved (₹)', 'Cash %', 'Overall Score %']
        ws.append(headers)
        today = timezone.localdate()
        for emp in emp_qs:
            target = EmployeeTarget.objects.filter(employee=emp, start_date__lte=today, end_date__gte=today).first()
            g_ach = float(gold_qs.filter(employee=emp, approval_status__in=['APPROVED', 'VERIFIED']).aggregate(tot=Sum('gold_weight_grams'))['tot'] or 0.0)
            c_ach = float(cash_qs.filter(employee=emp, approval_status__in=['APPROVED', 'VERIFIED']).aggregate(tot=Sum('cash_amount'))['tot'] or 0.0)
            g_tgt = float(target.gold_target_grams) if target else 100.0
            c_tgt = float(target.cash_target_amount) if target else 500000.0
            g_pct = round((g_ach / g_tgt) * 100, 1) if g_tgt > 0 else 0
            c_pct = round((c_ach / c_tgt) * 100, 1) if c_tgt > 0 else 0
            ov_pct = round((g_pct + c_pct) / 2, 1)
            ws.append([
                emp.employee_id,
                emp.get_full_name() or emp.username,
                g_tgt,
                round(g_ach, 3),
                f"{g_pct}%",
                c_tgt,
                round(c_ach, 2),
                f"{c_pct}%",
                f"{ov_pct}%"
            ])

    elif report_type == 'pending_approvals':
        headers = ['Type', 'Receipt No', 'Date & Time', 'Employee', 'Customer', 'Summary Description', 'Amount / Value (₹)', 'Status']
        ws.append(headers)
        for g in gold_qs.filter(approval_status='PENDING').order_by('-collection_datetime'):
            ws.append([
                'GOLD',
                g.receipt_number,
                g.collection_datetime.strftime('%Y-%m-%d %H:%M'),
                f"{g.employee.employee_id} - {g.employee.get_full_name() or g.employee.username}",
                g.customer_name,
                f"{g.gold_weight_grams}g ({g.gold_purity}) - {g.get_jewellery_type_display()}",
                float(g.estimated_value),
                'Pending Verification'
            ])
        for c in cash_qs.filter(approval_status='PENDING').order_by('-collection_datetime'):
            ws.append([
                'CASH',
                c.receipt_number,
                c.collection_datetime.strftime('%Y-%m-%d %H:%M'),
                f"{c.employee.employee_id} - {c.employee.get_full_name() or c.employee.username}",
                c.customer_name,
                f"Cash via {c.get_payment_method_display()}",
                float(c.cash_amount),
                'Pending Verification'
            ])

    elif report_type == 'cash_reconciliation':
        headers = ['Receipt No', 'Date & Time', 'Employee', 'Customer', 'Amount (₹)', 'Payment Method', 'Deposit Status', 'Bank Reference', 'Reconciled By']
        ws.append(headers)
        for c in cash_qs.order_by('-collection_datetime'):
            ws.append([
                c.receipt_number,
                c.collection_datetime.strftime('%Y-%m-%d %H:%M'),
                f"{c.employee.employee_id} - {c.employee.get_full_name() or c.employee.username}",
                c.customer_name,
                float(c.cash_amount),
                c.get_payment_method_display(),
                c.get_deposit_status_display(),
                c.bank_reference or '—',
                c.reconciled_by.get_full_name() if c.reconciled_by else '—'
            ])
    else:
        headers = ['Receipt / ID', 'Date', 'Employee', 'Customer / Item', 'Amount / Weight', 'Status']
        ws.append(headers)
        for g in gold_qs[:50]:
            ws.append([g.receipt_number, g.collection_datetime.strftime('%Y-%m-%d'), g.employee.employee_id, g.customer_name, f"{g.gold_weight_grams}g", g.approval_status])

    # Style header row
    for col in range(1, len(headers) + 1):
        cell = ws.cell(row=4, column=col)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')

    # Auto-fit column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"GoldFinance_{report_type}_{timezone.now().strftime('%Y%m%d_%H%M')}.xlsx"
    response = HttpResponse(output.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_pdf_view(request):
    """
    Exports branded PDF summary report using ReportLab.
    """
    report_type = request.query_params.get('type', 'daily_gold')
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')
    emp_id = request.query_params.get('employee')

    start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
    end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None

    gold_qs, cash_qs, visit_qs, emp_qs = get_scoped_data(request.user, emp_id, start_date, end_date)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()

    elements = []

    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#0B1329'),
        spaceAfter=6,
    )
    sub_style = ParagraphStyle(
        'SubStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#A37B1D'),
        spaceAfter=15,
    )

    elements.append(Paragraph("<b>GOLD FINANCE</b> — Collection & Tracking System", title_style))
    elements.append(Paragraph(f"Official Statement: <b>{report_type.upper().replace('_', ' ')}</b> | Generated on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}", sub_style))

    table_data = []

    if report_type == 'daily_gold':
        table_data.append(['Receipt No', 'Date', 'Employee', 'Customer', 'Type', 'Purity', 'Weight (g)', 'Est Value (₹)', 'Status'])
        for g in gold_qs[:40]:
            table_data.append([
                g.receipt_number,
                g.collection_datetime.strftime('%d-%m-%Y'),
                g.employee.employee_id,
                g.customer_name[:18],
                g.get_jewellery_type_display()[:15],
                g.gold_purity,
                f"{g.gold_weight_grams}g",
                f"₹{g.estimated_value:,.2f}",
                g.approval_status
            ])
    elif report_type == 'daily_cash':
        table_data.append(['Receipt No', 'Date', 'Employee', 'Customer', 'Amount (₹)', 'Method', 'Approval', 'Deposit'])
        for c in cash_qs[:40]:
            table_data.append([
                c.receipt_number,
                c.collection_datetime.strftime('%d-%m-%Y'),
                c.employee.employee_id,
                c.customer_name[:18],
                f"₹{c.cash_amount:,.2f}",
                c.get_payment_method_display()[:15],
                c.approval_status,
                c.deposit_status
            ])
    elif report_type == 'employee_wise':
        table_data.append(['Emp Code', 'Full Name', 'Phone', 'Coordinator', 'Gold (g)', 'Cash (₹)', 'Visits', 'Duty Status'])
        for emp in emp_qs[:40]:
            emp_gold = gold_qs.filter(employee=emp)
            emp_cash = cash_qs.filter(employee=emp)
            emp_visits = visit_qs.filter(employee=emp)
            gold_g = float(emp_gold.filter(approval_status__in=['APPROVED', 'VERIFIED']).aggregate(tot=Sum('gold_weight_grams'))['tot'] or 0.0)
            cash_a = float(emp_cash.filter(approval_status__in=['APPROVED', 'VERIFIED']).aggregate(tot=Sum('cash_amount'))['tot'] or 0.0)
            table_data.append([
                emp.employee_id,
                (emp.get_full_name() or emp.username)[:20],
                emp.phone or '—',
                (emp.assigned_coordinator.get_full_name() if emp.assigned_coordinator else 'Unassigned')[:16],
                f"{gold_g:.3f}g",
                f"₹{cash_a:,.2f}",
                str(emp_visits.count()),
                'Active' if emp.is_working else 'Offline'
            ])
    elif report_type == 'gps_visits':
        table_data.append(['Visit ID', 'Date & Time', 'Employee', 'Customer', 'Mobile', 'Purpose', 'Status', 'GPS Coords'])
        for v in visit_qs.order_by('-visit_datetime')[:40]:
            coords = f"{v.latitude:.4f}, {v.longitude:.4f}" if (v.latitude and v.longitude) else 'No GPS'
            table_data.append([
                f"VIS-{v.id:04d}",
                v.visit_datetime.strftime('%d-%m-%Y %H:%M'),
                v.employee.employee_id,
                v.customer_name[:18],
                v.customer_mobile,
                v.get_visit_purpose_display()[:15],
                v.get_visit_status_display(),
                coords
            ])
    elif report_type == 'monthly_perf':
        table_data.append(['Emp ID', 'Full Name', 'Gold Target', 'Gold Done', 'Gold %', 'Cash Target', 'Cash Done', 'Cash %', 'Overall'])
        today = timezone.localdate()
        for emp in emp_qs[:40]:
            target = EmployeeTarget.objects.filter(employee=emp, start_date__lte=today, end_date__gte=today).first()
            g_ach = float(gold_qs.filter(employee=emp, approval_status__in=['APPROVED', 'VERIFIED']).aggregate(tot=Sum('gold_weight_grams'))['tot'] or 0.0)
            c_ach = float(cash_qs.filter(employee=emp, approval_status__in=['APPROVED', 'VERIFIED']).aggregate(tot=Sum('cash_amount'))['tot'] or 0.0)
            g_tgt = float(target.gold_target_grams) if target else 100.0
            c_tgt = float(target.cash_target_amount) if target else 500000.0
            g_pct = round((g_ach / g_tgt) * 100, 1) if g_tgt > 0 else 0
            c_pct = round((c_ach / c_tgt) * 100, 1) if c_tgt > 0 else 0
            ov_pct = round((g_pct + c_pct) / 2, 1)
            table_data.append([
                emp.employee_id,
                (emp.get_full_name() or emp.username)[:16],
                f"{g_tgt:.1f}g",
                f"{g_ach:.1f}g",
                f"{g_pct}%",
                f"₹{c_tgt:,.0f}",
                f"₹{c_ach:,.0f}",
                f"{c_pct}%",
                f"{ov_pct}%"
            ])
    elif report_type == 'pending_approvals':
        table_data.append(['Type', 'Receipt No', 'Date', 'Employee', 'Customer', 'Summary Description', 'Amount / Value', 'Status'])
        for g in gold_qs.filter(approval_status='PENDING').order_by('-collection_datetime')[:20]:
            table_data.append([
                'GOLD',
                g.receipt_number,
                g.collection_datetime.strftime('%d-%m-%Y'),
                g.employee.employee_id,
                g.customer_name[:18],
                f"{g.gold_weight_grams}g ({g.gold_purity})",
                f"₹{g.estimated_value:,.2f}",
                'Pending'
            ])
        for c in cash_qs.filter(approval_status='PENDING').order_by('-collection_datetime')[:20]:
            table_data.append([
                'CASH',
                c.receipt_number,
                c.collection_datetime.strftime('%d-%m-%Y'),
                c.employee.employee_id,
                c.customer_name[:18],
                c.get_payment_method_display()[:15],
                f"₹{c.cash_amount:,.2f}",
                'Pending'
            ])
    elif report_type == 'cash_reconciliation':
        table_data.append(['Receipt No', 'Date', 'Employee', 'Customer', 'Amount (₹)', 'Payment Method', 'Deposit Status', 'Bank Ref / UTR'])
        for c in cash_qs.order_by('-collection_datetime')[:40]:
            table_data.append([
                c.receipt_number,
                c.collection_datetime.strftime('%d-%m-%Y'),
                c.employee.employee_id,
                c.customer_name[:18],
                f"₹{c.cash_amount:,.2f}",
                c.get_payment_method_display()[:15],
                c.get_deposit_status_display(),
                (c.bank_reference or '—')[:16]
            ])
    else:
        table_data.append(['Receipt No', 'Date', 'Employee', 'Customer', 'Amount (₹)', 'Method', 'Approval', 'Deposit'])
        for c in cash_qs[:40]:
            table_data.append([
                c.receipt_number,
                c.collection_datetime.strftime('%d-%m-%Y'),
                c.employee.employee_id,
                c.customer_name[:18],
                f"₹{c.cash_amount:,.2f}",
                c.get_payment_method_display()[:15],
                c.approval_status,
                c.deposit_status
            ])

    t = Table(table_data, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0B1329')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#D4AF37')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
    ]))

    elements.append(t)
    doc.build(elements)

    buffer.seek(0)
    filename = f"GoldFinance_{report_type}_{timezone.now().strftime('%Y%m%d_%H%M')}.pdf"
    response = HttpResponse(buffer.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
