"""
WSGI config for gold_tracker project.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gold_tracker.settings')

application = get_wsgi_application()

# Automatically run migrations & seed admin on boot if tables do not exist
try:
    from django.core.management import call_command
    from django.db import connection

    tables = connection.introspection.table_names()
    if 'accounts_user' not in tables:
        print("⚡ [STARTUP] Initializing database tables via migrations...")
        call_command('migrate', interactive=False)
        print("✓ [STARTUP] Migrations applied successfully.")

    from accounts.models import User
    if not User.objects.filter(username='admin').exists():
        print("⚡ [STARTUP] Seeding admin and initial test users...")
        try:
            import seed_data
            seed_data.seed()
            print("✓ [STARTUP] Database seeded successfully.")
        except Exception as seed_err:
            print(f"Warning seeding database: {seed_err}")
            admin_user = User.objects.create_superuser('admin', 'admin@goldfinance.com', 'admin123')
            admin_user.role = 'ADMIN'
            admin_user.employee_id = 'ADM-1001'
            admin_user.status = 'ACTIVE'
            admin_user.save()
            print("✓ [STARTUP] Superuser 'admin' created directly.")
except Exception as e:
    print(f"Startup database initialization notice: {e}")
