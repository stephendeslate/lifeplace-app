#!/usr/bin/env python3

import os
import re
import ast
from pathlib import Path
from collections import defaultdict

def get_python_files(directory):
    """Get all Python files, excluding certain directories"""
    exclude_dirs = {'venv', '__pycache__', 'migrations', 'node_modules', 'dist'}
    python_files = []
    
    for root, dirs, files in os.walk(directory):
        # Remove excluded directories from dirs to prevent descent
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))
    
    return python_files

def analyze_imports_and_usage(file_path):
    """Analyze imports and their usage in a file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all imports
        import_pattern = r'^(from\s+[\w.]+\s+)?import\s+([^#\n]+)'
        imports = []
        
        for match in re.finditer(import_pattern, content, re.MULTILINE):
            from_part = match.group(1)
            import_part = match.group(2)
            
            # Parse imported items
            imported_items = [item.strip().split(' as ') for item in import_part.split(',')]
            for item_parts in imported_items:
                imported_name = item_parts[0].strip()
                alias = item_parts[1].strip() if len(item_parts) > 1 else imported_name
                imports.append((imported_name, alias, from_part, match.start()))
        
        # Check usage of each import
        unused_imports = []
        for imported_name, alias, from_part, position in imports:
            # Search for usage after the import statement
            content_after_import = content[position + 50:]  # Skip the import line itself
            
            # Check if the alias/name is used
            if alias and not re.search(rf'\b{re.escape(alias)}\b', content_after_import):
                unused_imports.append((imported_name, alias, from_part))
        
        return unused_imports
        
    except Exception as e:
        return f"Error analyzing {file_path}: {e}"

def find_unused_functions_and_classes(file_path):
    """Find functions and classes that might be unused"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find function and class definitions
        func_pattern = r'^(def|class)\s+([a-zA-Z_][a-zA-Z0-9_]*)'
        definitions = []
        
        for match in re.finditer(func_pattern, content, re.MULTILINE):
            def_type = match.group(1)
            name = match.group(2)
            definitions.append((def_type, name))
        
        return definitions
        
    except Exception as e:
        return f"Error analyzing {file_path}: {e}"

def analyze_codebase(directory):
    """Main function to analyze the codebase"""
    python_files = get_python_files(directory)
    
    print(f"Analyzing {len(python_files)} Python files in {directory}")
    print("=" * 80)
    
    unused_imports_by_file = {}
    definitions_by_file = {}
    
    for file_path in python_files:
        relative_path = os.path.relpath(file_path)
        
        # Skip test files for now as they often have unused imports
        if 'test_' in os.path.basename(file_path) or '/tests/' in file_path:
            continue
            
        unused_imports = analyze_imports_and_usage(file_path)
        if unused_imports and not isinstance(unused_imports, str):
            unused_imports_by_file[relative_path] = unused_imports
        
        definitions = find_unused_functions_and_classes(file_path)
        if definitions and not isinstance(definitions, str):
            definitions_by_file[relative_path] = definitions
    
    # Print unused imports
    print("\nPOTENTIALLY UNUSED IMPORTS:")
    print("-" * 40)
    for file_path, unused in unused_imports_by_file.items():
        if unused:
            print(f"\n{file_path}:")
            for imported_name, alias, from_part in unused:
                print(f"  - {alias} ({imported_name})")
    
    return unused_imports_by_file, definitions_by_file

if __name__ == "__main__":
    # Analyze backend
    backend_dir = "backend"
    if os.path.exists(backend_dir):
        analyze_codebase(backend_dir)
    else:
        print(f"Directory {backend_dir} not found")