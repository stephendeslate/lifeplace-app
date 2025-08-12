import os
import shutil
from urllib.parse import urlparse


def export_files(url_paths, export_folder="export"):
    # Create the export folder if it doesn't exist
    if not os.path.exists(export_folder):
        os.makedirs(export_folder)

    def copy_recursively(directory, parent_prefix=""):
        for root, dirs, files in os.walk(directory):
            # Calculate the relative path from the base directory
            rel_path = os.path.relpath(root, directory)
            current_prefix = parent_prefix
            
            # Only add to prefix if we're not at the root
            if rel_path != "." and parent_prefix:
                current_prefix = f"{parent_prefix}-{os.path.basename(root)}"
            elif rel_path != ".":
                current_prefix = os.path.basename(root)

            # Process all files in current directory
            for file in files:
                if not file.endswith('.DS_Store'):
                    source_path = os.path.join(root, file)
                    
                    # Create new filename with prefix
                    if current_prefix:
                        new_file_name = f"{current_prefix}-{file}"
                    else:
                        new_file_name = file
                        
                    destination = os.path.join(export_folder, new_file_name)
                    shutil.copy2(source_path, destination)
                    print(f"Copied and renamed file: {source_path} to {new_file_name}")

    for url_path in url_paths:
        # Parse the URL to get the path
        parsed_url = urlparse(url_path)
        path = parsed_url.path

        # Convert URL path to local file system path
        local_path = os.path.normpath(path.lstrip('/'))

        if os.path.isfile(local_path):
            # If it's a file, copy and rename it (excluding .DS_Store)
            if not (local_path.endswith('.DS_Store') or local_path.endswith('svg')):
                parent_folder = os.path.basename(os.path.dirname(local_path))
                grandparent_folder = os.path.basename(os.path.dirname(os.path.dirname(local_path)))
                file_name = os.path.basename(local_path)
                new_file_name = f"{grandparent_folder}-{parent_folder}-{file_name}"
                destination = os.path.join(export_folder, new_file_name)
                shutil.copy2(local_path, destination)
                print(f"Copied and renamed file: {local_path} to {new_file_name}")
            else:
                print(f"Skipped .DS_Store file: {local_path}")
        elif os.path.isdir(local_path):
            # Check if this is a src directory
            if os.path.basename(local_path) == "src":
                # Recursively copy all files from src directory
                parent_folder = os.path.basename(os.path.dirname(local_path))
                copy_recursively(local_path, parent_folder)
            else:
                # Handle regular directories with two levels of parent folders
                parent_folder = os.path.basename(local_path)
                grandparent_folder = os.path.basename(os.path.dirname(local_path))
                for item in os.listdir(local_path):
                    item_path = os.path.join(local_path, item)
                    if os.path.isfile(item_path) and not item.endswith('.DS_Store'):
                        new_file_name = f"{grandparent_folder}-{parent_folder}-{item}"
                        destination = os.path.join(export_folder, new_file_name)
                        shutil.copy2(item_path, destination)
                        print(f"Copied and renamed file: {item_path} to {new_file_name}")
                    elif item.endswith('.DS_Store'):
                        print(f"Skipped .DS_Store file: {item_path}")
        else:
            print(f"Invalid path: {local_path}")

    print(f"All files have been exported to the '{export_folder}' folder.")

# Example usage
url_paths_example = [
    "backend/core/domains/events/models.py",
    "backend/core/domains/events/serializers.py",
    "backend/core/domains/events/views.py",
    "backend/core/domains/events/urls.py",
    "backend/core/domains/events/services.py",
    "frontend/admin-crm/src/App.tsx",
    "frontend/admin-crm/src/pages/settings/bookingflow/BookingFlows.tsx",
    "frontend/admin-crm/src/components/bookingflow/BookingStepTabs.tsx",
    "frontend/admin-crm/src/components/bookingflow/BookingStepForm.tsx",
    "frontend/admin-crm/src/components/bookingflow/BookingStepFormDate.tsx",
    "frontend/admin-crm/src/components/bookingflow/BookingStepFormProduct.tsx",
    "frontend/admin-crm/src/components/bookingflow/BookingStepFormQuestionnaire.tsx",
    "frontend/client-portal/src/App.tsx",
    "frontend/admin-crm/src/types/clients.types.ts",
    "frontend/admin-crm/src/pages/settings/bookingflow/BookingFlows.tsx",
    "frontend/admin-crm/src/pages/settings/bookingflow/EventTypes.tsx",
    "backend/core/domains/bookingflow/models.py",
    "backend/core/domains/bookingflow/serializers.py",
    "backend/core/domains/bookingflow/services.py",
    "backend/core/domains/bookingflow/views.py",
    "backend/core/domains/bookingflow/urls.py",
    "backend/core/domains/questionnaires/models.py",
    "backend/core/domains/questionnaires/serializers.py",
    "backend/core/domains/questionnaires/services.py",
    "backend/core/domains/questionnaires/urls.py",
    "backend/core/domains/questionnaires/views.py",
]

analytics_domain = [
    "backend/core/domains/analytics/models.py",
    "backend/core/domains/analytics/serializers.py",
    "backend/core/domains/analytics/services.py",
    "backend/core/domains/analytics/views.py",
    "backend/core/domains/analytics/urls.py",
    "backend/core/domains/analytics/tasks.py",
    "backend/core/domains/analytics/basic_serializers.py",
]

bookingflow_domain = [
    "backend/core/domains/bookingflow/models.py",
    "backend/core/domains/bookingflow/serializers.py",
    "backend/core/domains/analytics/basic_serializers.py",
    "backend/core/domains/bookingflow/signals.py",
    "backend/core/domains/bookingflow/urls.py",
    "backend/core/domains/bookingflow/services/",
    "backend/core/domains/bookingflow/views/",
]

clients_domain = [
    "backend/core/domains/clients/models.py",
    "backend/core/domains/clients/serializers.py",
    "backend/core/domains/clients/services.py",
    "backend/core/domains/clients/views.py",
    "backend/core/domains/clients/urls.py",
]

communications_domain = [
    "backend/core/domains/communications/models.py",
    "backend/core/domains/communications/serializers.py",
    "backend/core/domains/communications/services.py",
    "backend/core/domains/communications/views.py",
    "backend/core/domains/communications/urls.py",
    "backend/core/domains/communications/signals.py",
    "backend/core/domains/communications/webhooks.py",
]

contracts_domain = [
    "backend/core/domains/contracts/models.py",
    "backend/core/domains/contracts/serializers.py",
    "backend/core/domains/contracts/services.py",
    "backend/core/domains/contracts/views.py",
    "backend/core/domains/contracts/urls.py",
    "backend/core/domains/contracts/tasks.py",
    "backend/core/domains/contracts/basic_serializers.py",
]

events_domain = [
    "backend/core/domains/events/models.py",
    "backend/core/domains/events/serializers.py",
    "backend/core/domains/events/services.py",
    "backend/core/domains/events/views.py",
    "backend/core/domains/events/urls.py",
    "backend/core/domains/events/basic_serializers.py",
]

notes_domain = [
    "backend/core/domains/notes/models.py",
    "backend/core/domains/notes/serializers.py",
    "backend/core/domains/notes/services.py",
    "backend/core/domains/notes/views.py",
    "backend/core/domains/notes/urls.py",
    "backend/core/domains/notes/basic_serializers.py",
]

notifications_domain = [
    "backend/core/domains/notifications/models.py",
    "backend/core/domains/notifications/serializers.py",
    "backend/core/domains/notifications/services.py",
    "backend/core/domains/notifications/views.py",
    "backend/core/domains/notifications/urls.py",
    "backend/core/domains/notifications/basic_serializers.py",
]

payments_domain = [
    "backend/core/domains/payments/models.py",
    "backend/core/domains/payments/serializers.py",
    "backend/core/domains/payments/services/",
    "backend/core/domains/payments/views.py",
    "backend/core/domains/payments/urls.py",
]

products_domain = [
    "backend/core/domains/products/models.py",
    "backend/core/domains/products/serializers.py",
    "backend/core/domains/products/services.py",
    "backend/core/domains/products/views.py",
    "backend/core/domains/products/urls.py",
    "backend/core/domains/products/signals.py",
]

questionnaires_domain = [
    "backend/core/domains/questionnaires/models.py",
    "backend/core/domains/questionnaires/serializers.py",
    "backend/core/domains/questionnaires/services.py",
    "backend/core/domains/questionnaires/views.py",
    "backend/core/domains/questionnaires/urls.py",
    "backend/core/domains/questionnaires/basic_serializers.py",
]

sales_domain = [
    "backend/core/domains/sales/models.py",
    "backend/core/domains/sales/serializers.py",
    "backend/core/domains/sales/services.py",
    "backend/core/domains/sales/views.py",
    "backend/core/domains/sales/urls.py",
]

users_domain = [
    "backend/core/domains/users/models.py",
    "backend/core/domains/users/serializers.py",
    "backend/core/domains/users/services.py",
    "backend/core/domains/users/views.py",
    "backend/core/domains/users/urls.py",
    "backend/core/domains/users/views_password.py",
]

workflows_domain = [
    "backend/core/domains/workflows/models.py",
    "backend/core/domains/workflows/serializers.py",
    "backend/core/domains/workflows/services.py",
    "backend/core/domains/workflows/views.py",
    "backend/core/domains/workflows/urls.py",
    "backend/core/domains/workflows/basic_serializers.py",
]


backend_files = [
    *payments_domain,
    *events_domain,
    *clients_domain,
]
    

admin_crm_files = [
    "frontend/admin-crm/src/apis/",
    "frontend/admin-crm/src/hooks/",
    "frontend/admin-crm/src/components/events/",
    "frontend/admin-crm/src/types/",
    "frontend/admin-crm/src/pages/events/EventProfile.tsx",
    "frontend/admin-crm/src/pages/events/EventsOverview.tsx",
    "frontend/admin-crm/src/pages/clients/ClientProfile.tsx",
    "frontend/admin-crm/src/pages/clients/ClientsOverview.tsx",
    "frontend/admin-crm/src/pages/payments/PaymentsOverview.tsx",
    "frontend/admin-crm/src/pages/payments/PaymentProfile.tsx",
]

client_portal_files = [
    "frontend/client-portal/src/apis/",
    "frontend/client-portal/src/hooks/",
    "frontend/client-portal/src/components/booking/",
    "frontend/client-portal/src/components/booking/steps/",
    "frontend/client-portal/src/utils/",
    "frontend/client-portal/src/types/",

]

url_paths = [
    *backend_files, *admin_crm_files
]

export_files(url_paths)