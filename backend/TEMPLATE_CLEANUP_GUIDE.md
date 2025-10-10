# Communication Templates Cleanup Guide

## 🧹 New Management Command: `prepare_template_seeding`

This command cleans up communication templates to ensure a fresh seeding on Railway deployments.

---

## 🚀 Usage

### In Railway (Automatic - Part of Start Command)

Already included in your Railway Custom Start Command:

```bash
python manage.py prepare_template_seeding --force && python manage.py migrate --no-input && ...
```

**What it does:**
- ✅ Deletes all existing communication templates
- ✅ Allows migration to seed fresh 21 templates
- ✅ Prevents partial/duplicate template issues
- ✅ Runs automatically on every deployment

---

### Local/Manual Usage

#### 1. Dry Run (See what would be deleted)

```bash
python manage.py prepare_template_seeding --dry-run
```

**Output:**
```
======================================================================
🧹 COMMUNICATION TEMPLATES CLEANUP
======================================================================

📊 Current state:
   - Existing templates: 10
   - Expected templates: 21

⚠️  Partial seeding detected!
   Missing 11 templates

📋 Templates to be deleted:
   - Admin Invitation (EMAIL/SYSTEM)
   - Booking Confirmation (EMAIL/SYSTEM)
   ...

🔍 DRY RUN MODE - No changes made
   Would delete 10 templates
```

#### 2. Interactive Mode (With confirmation prompt)

```bash
python manage.py prepare_template_seeding
```

**Prompts for confirmation:**
```
⚠️  WARNING: This will DELETE all existing communication templates!

Type "yes" to confirm deletion:
```

#### 3. Force Mode (No confirmation - for automation)

```bash
python manage.py prepare_template_seeding --force
```

**Deletes immediately without prompting.**

---

## 📊 What The Command Shows

### If No Templates Exist
```
✅ No templates to clean up
   Ready for fresh seeding!
```

### If Partial Templates Exist (Your Case)
```
📊 Current state:
   - Existing templates: 10
   - Expected templates: 21

⚠️  Partial seeding detected!
   Missing 11 templates
```

### If All Templates Exist
```
📊 Current state:
   - Existing templates: 21
   - Expected templates: 21

✅ Template count matches expected
```

### After Deletion
```
✅ Successfully deleted 10 templates

📦 Next steps:
   1. Run migrations to trigger template seeding:
      python manage.py migrate --no-input

   OR manually load templates:
      python manage.py loaddata core/domains/communications/fixtures/default_templates.json
```

---

## 🔧 Common Scenarios

### Scenario 1: Railway Has Partial Templates (10/21)

**Problem:** You have 10 templates, need 21

**Solution:** Update Railway Custom Start Command to include cleanup:

```bash
python manage.py prepare_template_seeding --force && python manage.py migrate --no-input && python manage.py seed_default_settings && gunicorn -c gunicorn.conf.py core.wsgi:application
```

Then redeploy. Railway logs will show:
```
🧹 COMMUNICATION TEMPLATES CLEANUP
✅ Successfully deleted 10 templates

📧 COMMUNICATION TEMPLATES SEEDING
✅ Successfully loaded 21 communication templates!
```

---

### Scenario 2: Local Development - Need to Reset Templates

**Problem:** Your local templates are messed up

**Solution:**
```bash
# See what will be deleted
python manage.py prepare_template_seeding --dry-run

# Delete and reload
python manage.py prepare_template_seeding --force
python manage.py migrate --no-input
```

---

### Scenario 3: Fresh Production Deployment

**Problem:** First time deploying to Railway

**Solution:** Same command works! If no templates exist, it just skips:
```
✅ No templates to clean up
   Ready for fresh seeding!
```

---

## ⚠️ Important Notes

### Safe to Run Multiple Times
✅ **Idempotent**: Safe to run on every deployment
✅ **No harm**: If no templates exist, it just skips
✅ **Smart**: Warns about partial seeding

### What Gets Deleted
❌ **ALL** CommunicationTemplate objects
- System templates (EMAIL/SYSTEM)
- Auto templates (EMAIL/AUTO)
- Manual templates (EMAIL/MANUAL)
- SMS templates (SMS/SYSTEM, SMS/MANUAL)

### What Doesn't Get Deleted
✅ CommunicationRecord (sent message history)
✅ Other domain data (settings, payments, etc.)
✅ User data

---

## 🔍 Verifying After Cleanup

After running cleanup and migration:

```bash
# Check template count
python manage.py shell -c "
from core.domains.communications.models import CommunicationTemplate
print(f'Templates: {CommunicationTemplate.objects.count()}')
"
```

**Expected output:** `Templates: 21`

---

## 🐛 Troubleshooting

### Command Not Found

**Error:**
```
Unknown command: 'prepare_template_seeding'
```

**Solution:** Ensure the command file exists:
```bash
ls -la core/domains/communications/management/commands/prepare_template_seeding.py
```

### Permission Issues

**Error:**
```
OperationalError: database is locked
```

**Solution:** No other processes should be accessing the database

### Railway Not Running Cleanup

**Check:**
1. Custom Start Command includes `prepare_template_seeding --force`
2. Command is separated by `&&`
3. Redeploy after changing command

---

## 📚 Related Commands

### Load Templates Manually (Without Migration)

```bash
python manage.py loaddata core/domains/communications/fixtures/default_templates.json
```

### Seed All Default Settings

```bash
python manage.py seed_default_settings
```

### Check Django Setup

```bash
python manage.py check
```

---

## ✅ Summary

- ✅ **Created**: `prepare_template_seeding` management command
- ✅ **Purpose**: Clean up templates before fresh seeding
- ✅ **Modes**: Dry-run, Interactive, Force
- ✅ **Railway**: Automatically runs on deployment
- ✅ **Safe**: Idempotent, won't break if no templates exist
- ✅ **Smart**: Detects partial seeding and warns

**Result:** Every Railway deployment will have exactly 21 communication templates! 🎉
