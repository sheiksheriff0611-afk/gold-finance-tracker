"""
URL configuration for gold_tracker project.
GOLD FINANCE - EMPLOYEE TRACKER & COLLECTION MANAGEMENT SYSTEM
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, JsonResponse


def api_root_view(request):
    if 'text/html' in request.META.get('HTTP_ACCEPT', ''):
        html_content = """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Gold Finance - Backend API Online</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    background: #070c18;
                    color: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                }
                .card {
                    background: #0b1329;
                    border: 1px solid #1a2c5b;
                    border-radius: 16px;
                    padding: 36px;
                    max-width: 520px;
                    width: 90%;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.6);
                    text-align: center;
                }
                .badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(16, 185, 129, 0.15);
                    color: #34d399;
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    border-radius: 9999px;
                    padding: 5px 14px;
                    font-size: 12px;
                    font-weight: 600;
                    margin-bottom: 16px;
                }
                .badge::before {
                    content: "";
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                }
                h1 {
                    font-size: 24px;
                    margin: 0 0 8px;
                    color: #fbbf24;
                }
                p {
                    font-size: 14px;
                    color: #94a3b8;
                    line-height: 1.6;
                    margin: 0 0 24px;
                }
                .links {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-bottom: 24px;
                }
                .btn {
                    display: block;
                    padding: 12px 18px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                .btn-primary {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: #020617;
                }
                .btn-secondary {
                    background: #111e3f;
                    color: #cbd5e1;
                    border: 1px solid #1a2c5b;
                }
                .btn:hover {
                    opacity: 0.9;
                    transform: translateY(-1px);
                }
                .info-box {
                    background: #070c18;
                    border: 1px solid #1a2c5b;
                    border-radius: 8px;
                    padding: 14px;
                    text-align: left;
                    font-size: 12px;
                    color: #94a3b8;
                    line-height: 1.5;
                }
                .info-box strong { color: #f1f5f9; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="badge">API Server Running Live</div>
                <h1>GOLD FINANCE</h1>
                <p>Employee Tracker & Loan Recovery Management Backend</p>
                
                <div class="links">
                    <a href="/admin/" class="btn btn-primary">Open Django Admin Portal</a>
                    <a href="/api/accounts/setup-admin/" class="btn btn-secondary">⚡ Enable / Reset Admin Account</a>
                    <a href="/api/accounts/cities-branches/" class="btn btn-secondary">Test API: Cities & Branches</a>
                </div>

                <div class="info-box">
                    <strong>ℹ️ Backend Notice:</strong> You are viewing the <strong>Backend API Service</strong> on Render.<br>
                    To view the full user interface, deploy the <strong>Frontend Static Site</strong> on Render.
                </div>
            </div>
        </body>
        </html>
        """
        return HttpResponse(html_content)

    return JsonResponse({
        "status": "online",
        "service": "Gold Finance API",
        "version": "1.0.0",
        "admin": "/admin/",
        "endpoints": {
            "accounts": "/api/accounts/",
            "tracking": "/api/tracking/",
            "collections": "/api/collections/",
            "reports": "/api/reports/",
            "cities_branches": "/api/accounts/cities-branches/"
        }
    })


urlpatterns = [
    path('', api_root_view, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/tracking/', include('tracking.urls')),
    path('api/collections/', include('finance_collections.urls')),
    path('api/reports/', include('reports.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
