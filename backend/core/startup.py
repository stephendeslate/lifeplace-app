"""
Startup tasks that run when the Django application starts.
"""
import os
import sys
import logging
from django.core.management import call_command
from django.db import connection, connections, OperationalError
from django.db.migrations.executor import MigrationExecutor

logger = logging.getLogger(__name__)


def should_run_migrations():
    """
    Determine if we should run migrations automatically.
    """
    # Don't run during migration commands (avoid recursion)
    if any(arg in sys.argv for arg in ['migrate', 'makemigrations', 'showmigrations', 'sqlmigrate']):
        return False
    
    # Don't run during tests
    if 'test' in sys.argv or 'pytest' in sys.argv[0]:
        return False
    
    # Don't run for certain management commands
    if any(arg in sys.argv for arg in ['shell', 'dbshell', 'createsuperuser', 'collectstatic']):
        return False
    
    # Check if we're in a production environment (Railway, Heroku, etc.)
    is_production = any([
        os.environ.get('RAILWAY_ENVIRONMENT'),  # Railway
        os.environ.get('DYNO'),  # Heroku
        os.environ.get('ENV') == 'production',
        os.environ.get('DJANGO_SETTINGS_MODULE') == 'core.settings.production',
    ])
    
    # Run for runserver OR in production environments (where gunicorn/uwsgi might be used)
    if not ('runserver' in sys.argv or is_production):
        return False
        
    # Check if we're using PostgreSQL
    db_url = os.environ.get('DATABASE_URL', '')
    if not (db_url.startswith('postgres') or db_url.startswith('postgresql')):
        return False
        
    return True


def run_pending_migrations():
    """
    Automatically run pending migrations on startup.
    This is particularly useful for deployment platforms like Railway 
    where manual migration commands cannot be easily run.
    """
    if not should_run_migrations():
        return
        
    try:
        # Get the database connection
        db_conn = connections['default']
        
        # Ensure the connection is established
        db_conn.ensure_connection()
        
        # Check if there are pending migrations
        executor = MigrationExecutor(db_conn)
        plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
        
        if plan:
            logger.info("=" * 60)
            logger.info("AUTOMATIC MIGRATION SYSTEM")
            logger.info("=" * 60)
            logger.info(f"Found {len(plan)} pending migrations.")
            
            # List the pending migrations
            for migration, backwards in plan:
                logger.info(f"  - {migration.app_label}.{migration.name}")
            
            logger.info("Running migrations automatically...")
            
            # Run migrations
            call_command('migrate', '--no-input', verbosity=2)
            
            logger.info("=" * 60)
            logger.info("Migrations completed successfully!")
            logger.info("=" * 60)
        else:
            logger.info("No pending migrations found.")
            
    except OperationalError as e:
        # Database might not be ready yet
        logger.warning(f"Database not ready for migrations: {e}")
        logger.info("Migrations will be run when database is available.")
    except Exception as e:
        # Log the error but don't crash the application
        logger.error(f"Error running automatic migrations: {e}")
        logger.warning("Please run migrations manually if needed.")
        # Don't raise the exception - let the app start anyway


def initialize():
    """
    Run all startup tasks.
    """
    # Run migrations if conditions are met
    run_pending_migrations()