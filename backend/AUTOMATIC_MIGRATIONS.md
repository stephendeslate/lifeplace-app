# Automatic Migration System

This Django application uses an **automatic migration system** via Django's AppConfig signal system. Migrations run automatically when the application starts in production environments.

## How It Works

### Signal-Based Architecture

1. **Trigger Point**: [core/__init__.py](core/__init__.py)
   - Registers `CoreConfig` as the default app config

2. **Signal Handler**: [core/apps.py](core/apps.py)
   - `CoreConfig.ready()` method fires when Django initializes
   - Calls `startup.initialize()` to run startup tasks

3. **Migration Logic**: [core/startup.py](core/startup.py)
   - `run_pending_migrations()` checks for and runs pending migrations
   - Only runs in production environments (Railway, Heroku, etc.)
   - Safe guards prevent double-running during management commands

## When Migrations Run Automatically

✅ **Will Run:**
- Production environments (Railway, Heroku, or `ENV=production`)
- When using PostgreSQL database
- When gunicorn/uwsgi starts
- During `python manage.py runserver` (development)

❌ **Will NOT Run:**
- During test execution
- During management commands (`migrate`, `makemigrations`, `shell`, `collectstatic`, etc.)
- When not using PostgreSQL
- In non-production environments without explicit triggers

## Production Deployment Flow

### Current Setup (Optimized)

```bash
# Dockerfile CMD
python manage.py railway_createsuperuser || true && gunicorn core.wsgi:application ...
```

**Execution Order:**
1. Container starts
2. `railway_createsuperuser` runs (creates superuser if needed)
3. Gunicorn starts
4. Django initializes → `CoreConfig.ready()` fires
5. `startup.py` checks for pending migrations
6. Migrations run automatically (if needed)
7. Application becomes available

### Previous Setup (Deprecated)

```bash
# Old Dockerfile CMD - DON'T USE
python manage.py migrate && python manage.py railway_createsuperuser && gunicorn ...
```

**Why changed:**
- Caused migrations to run twice (once in CMD, once via signal)
- Less flexible across deployment platforms
- Didn't handle all edge cases properly

## Viewing Migration Logs

When migrations run automatically, you'll see output like:

```
============================================================
🔄 AUTOMATIC MIGRATION SYSTEM (via Django Signal)
============================================================
Found 2 pending migration(s)
  ➜ core.0003_fix_security_event_username_default
  ➜ users.0005_update_user_profile_fields
Running migrations automatically...
============================================================
✅ Migrations completed successfully in 1.23s!
============================================================
```

If no migrations are needed:
```
✓ Database is up to date (no pending migrations)
```

## Manual Migration Control

### Disable Automatic Migrations

If you need to disable automatic migrations temporarily:

1. **Set environment variable:**
   ```bash
   export DJANGO_DISABLE_AUTO_MIGRATE=true
   ```

2. **Or modify** [core/startup.py](core/startup.py):
   ```python
   def should_run_migrations():
       # Add at the top of the function
       if os.environ.get('DJANGO_DISABLE_AUTO_MIGRATE') == 'true':
           return False
       # ... rest of the function
   ```

### Run Migrations Manually

You can still run migrations manually when needed:

```bash
# Local development
python manage.py migrate

# In production (via Railway CLI or similar)
railway run python manage.py migrate
```

## Troubleshooting

### Migrations Not Running

**Check these conditions:**
1. Is `ENV=production` or `RAILWAY_ENVIRONMENT` set?
2. Is `DATABASE_URL` set and pointing to PostgreSQL?
3. Check logs for error messages starting with `⚠️` or `❌`

**View migration status:**
```bash
python manage.py showmigrations
```

### Migrations Failing

The system is designed to fail gracefully:
- If migrations fail, the application still starts
- Errors are logged with `❌` prefix
- You can run migrations manually to fix issues

**Common issues:**
- Database connection timeout (check DATABASE_URL)
- Missing dependencies in requirements.txt
- Database permission issues

## Benefits of This Approach

✅ **Zero-downtime deployments**
- Migrations run as app starts, before handling requests

✅ **Platform-agnostic**
- Works with Railway, Heroku, Docker, or any deployment platform
- No need for platform-specific migration hooks

✅ **Developer-friendly**
- Same migration system in development and production
- No need to remember to run migrations manually

✅ **Safe by design**
- Won't run during tests or management commands
- Graceful failure handling
- Prevents double-execution

## Related Files

- [core/__init__.py](core/__init__.py) - Registers CoreConfig
- [core/apps.py](core/apps.py) - AppConfig with ready() signal
- [core/startup.py](core/startup.py) - Migration logic implementation
- [Dockerfile](Dockerfile) - Production startup command

## Additional Notes

- The system uses Django's `MigrationExecutor` to check for pending migrations
- Migrations are logged at INFO level for visibility
- Failed migrations don't crash the application
- The same codebase works for both development and production
