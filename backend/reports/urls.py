from django.urls import path
from .views import report_data_view, export_excel_view, export_pdf_view

urlpatterns = [
    path('data/', report_data_view, name='report-data'),
    path('export/excel/', export_excel_view, name='report-export-excel'),
    path('export/pdf/', export_pdf_view, name='report-export-pdf'),
]

