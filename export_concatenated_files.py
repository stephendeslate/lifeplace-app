import os
from urllib.parse import urlparse

def concatenate(file_paths, array_name, export_folder="export-concatenated"):
    # Create the export folder if it doesn't exist
    if not os.path.exists(export_folder):
        os.makedirs(export_folder)

    # Define the output markdown file path
    output_file = os.path.join(export_folder, f"{array_name}.md")
    
    # Open the output file in write mode
    with open(output_file, 'w', encoding='utf-8') as outfile:
        # Write a header for the concatenated file
        outfile.write(f"# Concatenated Files for {array_name}\n\n")
        
        def process_directory(directory, parent_prefix=""):
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
                        try:
                            with open(source_path, 'r', encoding='utf-8') as infile:
                                content = infile.read()
                            # Write file header and content to the markdown file
                            outfile.write(f"## File: {source_path}\n\n")
                            outfile.write("```" + (os.path.splitext(source_path)[1][1:] or "text") + "\n")
                            outfile.write(content)
                            outfile.write("\n```\n\n")
                            print(f"Added {source_path} to {output_file}")
                        except Exception as e:
                            print(f"Error reading {source_path}: {str(e)}")

        for file_path in file_paths:
            # Parse the URL to get the path
            parsed_url = urlparse(file_path)
            path = parsed_url.path
            
            # Convert URL path to local file system path
            local_path = os.path.normpath(path.lstrip('/'))
            
            if os.path.isfile(local_path) and not local_path.endswith('.DS_Store'):
                try:
                    # Read the content of the file
                    with open(local_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                    
                    # Write file header and content to the markdown file
                    outfile.write(f"## File: {local_path}\n\n")
                    outfile.write("```" + (os.path.splitext(local_path)[1][1:] or "text") + "\n")
                    outfile.write(content)
                    outfile.write("\n```\n\n")
                    print(f"Added {local_path} to {output_file}")
                except Exception as e:
                    print(f"Error reading {local_path}: {str(e)}")
            elif os.path.isdir(local_path):
                # Handle directories recursively
                parent_folder = os.path.basename(os.path.dirname(local_path))
                process_directory(local_path, parent_folder)
            else:
                print(f"Skipped {local_path}: Not a valid file or directory")
    
    print(f"Created concatenated file: {output_file}")

def export_files(array_of_arrays, array_names):
    # Ensure array_names length matches array_of_arrays
    if len(array_of_arrays) != len(array_names):
        raise ValueError("The number of arrays and array names must match")
    
    # Process each array of file paths
    for file_paths, array_name in zip(array_of_arrays, array_names):
        concatenate(file_paths, array_name)

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
    *workflows_domain,
    *contracts_domain,
    *communications_domain,
    *notes_domain,
    *sales_domain,
    *payments_domain,
    *events_domain,
    *clients_domain,
    *products_domain,
    *questionnaires_domain,
]

admin_crm_files = [
    "frontend/admin-crm/src/apis/",
    "frontend/admin-crm/src/hooks/",
    "frontend/admin-crm/src/components/events/"
    "frontend/admin-crm/src/components/types/",
    "frontend/admin-crm/src/pages/events/EventProfile.tsx",
]

client_portal_files = [
    "frontend/client-portal/src/apis/",
    "frontend/client-portal/src/hooks/",
]

url_paths = [
    contracts_domain,
    notes_domain,
    sales_domain,
    payments_domain,
    events_domain,
    questionnaires_domain,
    admin_crm_files,
    bookingflow_domain
]

array_names = [
    "contracts_domain",
    "notes_domain",
    "sales_domain",
    "payments_domain",
    "events_domain",
    "questionnaires_domain",
    "admin_crm_files",
    "bookingflow_domain"
]

export_files(url_paths, array_names)