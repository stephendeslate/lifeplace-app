#!/usr/bin/env python3

import os
import re
from pathlib import Path

def get_ts_files(directory):
    """Get all TypeScript files, excluding node_modules and dist"""
    exclude_dirs = {'node_modules', 'dist', '.git'}
    ts_files = []
    
    for root, dirs, files in os.walk(directory):
        # Remove excluded directories from dirs to prevent descent
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                ts_files.append(os.path.join(root, file))
    
    return ts_files

def analyze_ts_imports_and_exports(file_path):
    """Analyze TypeScript imports and exports"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find imports
        import_patterns = [
            r"import\s+{([^}]*)}\s+from\s+['\"]([^'\"]+)['\"]",  # named imports
            r"import\s+(\w+)\s+from\s+['\"]([^'\"]+)['\"]",      # default imports
            r"import\s+\*\s+as\s+(\w+)\s+from\s+['\"]([^'\"]+)['\"]",  # namespace imports
        ]
        
        # Find exports
        export_patterns = [
            r"export\s+{([^}]*)}\s*;?",  # named exports
            r"export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)",  # exported declarations
            r"export\s+default\s+(\w+)",  # default exports
            r"export\s+\*\s+from\s+['\"]([^'\"]+)['\"]",  # re-exports
        ]
        
        imports = []
        exports = []
        
        # Extract imports
        for pattern in import_patterns:
            matches = re.finditer(pattern, content)
            for match in matches:
                if '{' in pattern and '}' in pattern:  # named imports
                    named_imports = [item.strip() for item in match.group(1).split(',')]
                    for imp in named_imports:
                        if ' as ' in imp:
                            imp = imp.split(' as ')[1].strip()
                        imports.append(imp.strip())
                else:
                    imports.append(match.group(1))
        
        # Extract exports
        for pattern in export_patterns:
            matches = re.finditer(pattern, content)
            for match in matches:
                if '{' in pattern and '}' in pattern:  # named exports
                    if match.group(1):
                        named_exports = [item.strip() for item in match.group(1).split(',')]
                        exports.extend(named_exports)
                elif match.group(1):
                    exports.append(match.group(1))
        
        # Check for unused imports
        unused_imports = []
        for imp in imports:
            # Simple check if import is used in the file
            # Skip common patterns like React, useEffect, etc.
            if imp and imp not in ['React', 'ReactDOM', 'Component', 'FC']:
                # Search for usage after import statements
                if not re.search(rf'\b{re.escape(imp)}\b', content[content.find(imp) + len(imp):]):
                    unused_imports.append(imp)
        
        return unused_imports, exports, imports
        
    except Exception as e:
        return f"Error analyzing {file_path}: {e}", [], []

def find_unused_functions_and_types(file_path):
    """Find function and type definitions in TypeScript files"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Patterns for different definitions
        patterns = {
            'function': r'(?:export\s+)?function\s+(\w+)',
            'const_function': r'(?:export\s+)?const\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>\s*{|\([^)]*\)\s*:\s*[^=]*=>\s*{|async\s*\([^)]*\)\s*=>\s*{)',
            'interface': r'(?:export\s+)?interface\s+(\w+)',
            'type': r'(?:export\s+)?type\s+(\w+)',
            'class': r'(?:export\s+)?class\s+(\w+)',
            'enum': r'(?:export\s+)?enum\s+(\w+)',
        }
        
        definitions = {}
        for def_type, pattern in patterns.items():
            matches = re.finditer(pattern, content)
            definitions[def_type] = [match.group(1) for match in matches]
        
        return definitions
        
    except Exception as e:
        return f"Error analyzing {file_path}: {e}"

def analyze_frontend_codebase(directory):
    """Analyze frontend codebase"""
    ts_files = get_ts_files(directory)
    
    print(f"Analyzing {len(ts_files)} TypeScript files in {directory}")
    print("=" * 80)
    
    unused_imports_by_file = {}
    definitions_by_file = {}
    all_exports = {}
    all_imports = {}
    
    for file_path in ts_files:
        relative_path = os.path.relpath(file_path)
        
        # Skip test files and config files
        if any(skip in relative_path for skip in ['test', 'spec', 'config', 'setup', 'vite-env']):
            continue
        
        unused_imports, exports, imports = analyze_ts_imports_and_exports(file_path)
        if unused_imports and not isinstance(unused_imports, str):
            if unused_imports:
                unused_imports_by_file[relative_path] = unused_imports
        
        # Store exports and imports for cross-reference
        if exports:
            all_exports[relative_path] = exports
        if imports:
            all_imports[relative_path] = imports
        
        definitions = find_unused_functions_and_types(file_path)
        if definitions and not isinstance(definitions, str):
            definitions_by_file[relative_path] = definitions
    
    # Print results
    print("\nPOTENTIALLY UNUSED IMPORTS:")
    print("-" * 40)
    for file_path, unused in unused_imports_by_file.items():
        if unused:
            print(f"\n{file_path}:")
            for imp in unused:
                print(f"  - {imp}")
    
    # Print definitions (for manual review)
    print("\nFUNCTION/TYPE DEFINITIONS (for manual review):")
    print("-" * 50)
    for file_path, defs in definitions_by_file.items():
        if any(defs.values()):
            print(f"\n{file_path}:")
            for def_type, names in defs.items():
                if names:
                    print(f"  {def_type}: {', '.join(names)}")
    
    return unused_imports_by_file, definitions_by_file

if __name__ == "__main__":
    # Analyze admin-crm
    admin_dir = "frontend/admin-crm"
    if os.path.exists(admin_dir):
        print("=== ADMIN-CRM ANALYSIS ===")
        analyze_frontend_codebase(admin_dir)
    
    print("\n" + "=" * 80 + "\n")
    
    # Analyze client-portal
    client_dir = "frontend/client-portal"
    if os.path.exists(client_dir):
        print("=== CLIENT-PORTAL ANALYSIS ===")
        analyze_frontend_codebase(client_dir)