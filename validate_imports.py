#!/usr/bin/env python3
"""
Comprehensive Import Path Validation Script

This script validates all relative import paths in the frontend/shared directory:
1. Finds all TypeScript/JavaScript files
2. Extracts relative imports (starting with './' or '../')
3. Validates that each path points to an existing file
4. Detects potential circular dependencies
5. Provides detailed reporting

Focus areas:
- Core messaging system files
- Hook exports and imports
- Service layer imports
- Context and provider imports
"""

import os
import re
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from collections import defaultdict

class ImportValidator:
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)
        self.files_checked = 0
        self.imports_found = 0
        self.broken_imports = []
        self.circular_dependencies = []
        self.import_graph = defaultdict(set)
        self.file_imports = {}
        
    def get_typescript_files(self) -> List[Path]:
        """Get all TypeScript/JavaScript files, excluding node_modules"""
        ts_files = []
        for ext in ['*.ts', '*.tsx']:
            ts_files.extend(self.base_dir.rglob(ext))
        
        # Filter out node_modules and build directories
        filtered_files = []
        for file_path in ts_files:
            if 'node_modules' not in str(file_path) and 'dist' not in str(file_path):
                filtered_files.append(file_path)
        
        return sorted(filtered_files)
    
    def extract_imports(self, file_path: Path) -> List[Tuple[str, int]]:
        """Extract all relative imports from a file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"⚠️  Error reading {file_path}: {e}")
            return []
        
        imports = []
        
        # Pattern to match import statements with relative paths
        import_patterns = [
            # import { ... } from './path' or '../path'
            r"import\s+.*?\s+from\s+['\"](\.[^'\"]+)['\"]",
            # import './path' or '../path'
            r"import\s+['\"](\.[^'\"]+)['\"]",
            # export { ... } from './path' or '../path'
            r"export\s+.*?\s+from\s+['\"](\.[^'\"]+)['\"]",
            # export * from './path' or '../path'
            r"export\s+\*\s+from\s+['\"](\.[^'\"]+)['\"]",
        ]
        
        for line_num, line in enumerate(content.split('\n'), 1):
            # Skip commented lines
            line = line.strip()
            if line.startswith('//') or line.startswith('/*'):
                continue
                
            for pattern in import_patterns:
                matches = re.findall(pattern, line)
                for match in matches:
                    imports.append((match, line_num))
                    self.imports_found += 1
        
        return imports
    
    def resolve_import_path(self, base_file: Path, import_path: str) -> Optional[Path]:
        """Resolve a relative import path to an absolute path"""
        base_dir = base_file.parent
        
        # Handle different import path formats
        if import_path.startswith('./'):
            target_path = base_dir / import_path[2:]
        elif import_path.startswith('../'):
            target_path = base_dir / import_path
        else:
            target_path = base_dir / import_path
        
        # Normalize the path
        try:
            target_path = target_path.resolve()
        except Exception:
            return None
        
        # Check if the path exists as-is (for directories with index files)
        if target_path.exists():
            if target_path.is_dir():
                # Check for index files
                for index_file in ['index.ts', 'index.tsx', 'index.js', 'index.jsx']:
                    index_path = target_path / index_file
                    if index_path.exists():
                        return index_path
                return None
            else:
                return target_path
        
        # Check with common extensions
        for ext in ['.ts', '.tsx', '.js', '.jsx']:
            target_with_ext = target_path.with_suffix(ext)
            if target_with_ext.exists():
                return target_with_ext
        
        return None
    
    def validate_file_imports(self, file_path: Path) -> Dict:
        """Validate all imports in a single file"""
        relative_path = file_path.relative_to(self.base_dir)
        imports = self.extract_imports(file_path)
        
        file_result = {
            'file': str(relative_path),
            'total_imports': len(imports),
            'broken_imports': [],
            'valid_imports': []
        }
        
        # Track imports for this file
        file_imports = set()
        
        for import_path, line_num in imports:
            resolved_path = self.resolve_import_path(file_path, import_path)
            
            if resolved_path is None:
                broken_import = {
                    'import_path': import_path,
                    'line': line_num,
                    'reason': 'File not found'
                }
                file_result['broken_imports'].append(broken_import)
                self.broken_imports.append({
                    'file': str(relative_path),
                    'import_path': import_path,
                    'line': line_num,
                    'reason': 'File not found'
                })
            else:
                # Check if resolved path is within our base directory
                try:
                    resolved_relative = resolved_path.relative_to(self.base_dir)
                    file_result['valid_imports'].append({
                        'import_path': import_path,
                        'resolved_path': str(resolved_relative),
                        'line': line_num
                    })
                    
                    # Track for circular dependency detection
                    file_imports.add(str(resolved_relative))
                    self.import_graph[str(relative_path)].add(str(resolved_relative))
                    
                except ValueError:
                    # Path is outside our base directory - this is ok
                    file_result['valid_imports'].append({
                        'import_path': import_path,
                        'resolved_path': str(resolved_path),
                        'line': line_num,
                        'external': True
                    })
        
        self.file_imports[str(relative_path)] = file_imports
        return file_result
    
    def detect_circular_dependencies(self) -> List[List[str]]:
        """Detect circular dependencies using DFS"""
        visited = set()
        rec_stack = set()
        cycles = []
        
        def dfs(node: str, path: List[str]) -> bool:
            visited.add(node)
            rec_stack.add(node)
            current_path = path + [node]
            
            for neighbor in self.import_graph.get(node, set()):
                if neighbor not in visited:
                    if dfs(neighbor, current_path):
                        return True
                elif neighbor in rec_stack:
                    # Found a cycle
                    cycle_start = current_path.index(neighbor)
                    cycle = current_path[cycle_start:] + [neighbor]
                    cycles.append(cycle)
                    return True
            
            rec_stack.remove(node)
            return False
        
        for node in self.import_graph:
            if node not in visited:
                dfs(node, [])
        
        return cycles
    
    def analyze_core_messaging_files(self, results: List[Dict]) -> Dict:
        """Special analysis for core messaging system files"""
        core_files = [
            'providers/MessagingProvider.tsx',
            'services/websocket.service.ts', 
            'services/websocket.context.tsx',
            'hooks/messaging/index.ts',
            'hooks/index.ts',
            'services/index.ts',
            'index.ts'
        ]
        
        core_analysis = {
            'files_found': [],
            'files_missing': [],
            'import_issues': [],
            'healthy_files': []
        }
        
        # Create a lookup for results
        results_by_file = {r['file']: r for r in results}
        
        for core_file in core_files:
            if core_file in results_by_file:
                core_analysis['files_found'].append(core_file)
                file_result = results_by_file[core_file]
                
                if file_result['broken_imports']:
                    core_analysis['import_issues'].append({
                        'file': core_file,
                        'broken_imports': file_result['broken_imports']
                    })
                else:
                    core_analysis['healthy_files'].append(core_file)
            else:
                core_analysis['files_missing'].append(core_file)
        
        return core_analysis
    
    def validate_all(self) -> Dict:
        """Run complete validation"""
        print("🔍 Starting comprehensive import validation...")
        print(f"📁 Base directory: {self.base_dir}")
        
        ts_files = self.get_typescript_files()
        print(f"📄 Found {len(ts_files)} TypeScript/JavaScript files")
        
        results = []
        
        for file_path in ts_files:
            self.files_checked += 1
            file_result = self.validate_file_imports(file_path)
            results.append(file_result)
            
            # Progress indicator
            if self.files_checked % 10 == 0:
                print(f"📊 Processed {self.files_checked} files...")
        
        print(f"🔄 Detecting circular dependencies...")
        circular_deps = self.detect_circular_dependencies()
        
        print(f"🎯 Analyzing core messaging files...")
        core_analysis = self.analyze_core_messaging_files(results)
        
        return {
            'summary': {
                'files_checked': self.files_checked,
                'imports_found': self.imports_found,
                'broken_imports_count': len(self.broken_imports),
                'circular_dependencies_count': len(circular_deps)
            },
            'files': results,
            'broken_imports': self.broken_imports,
            'circular_dependencies': circular_deps,
            'core_messaging_analysis': core_analysis
        }

def print_report(validation_result: Dict):
    """Print a detailed validation report"""
    summary = validation_result['summary']
    
    print("\n" + "="*80)
    print("📋 IMPORT VALIDATION REPORT")
    print("="*80)
    
    print(f"""
📊 SUMMARY:
   Files checked: {summary['files_checked']}
   Total imports found: {summary['imports_found']}
   Broken imports: {summary['broken_imports_count']}
   Circular dependencies: {summary['circular_dependencies_count']}
""")
    
    # Broken imports section
    if validation_result['broken_imports']:
        print("\n❌ BROKEN IMPORT PATHS:")
        print("-" * 50)
        for broken in validation_result['broken_imports']:
            print(f"  📄 {broken['file']}:{broken['line']}")
            print(f"     ❌ {broken['import_path']} - {broken['reason']}")
            print()
    else:
        print("\n✅ No broken import paths found!")
    
    # Circular dependencies section
    if validation_result['circular_dependencies']:
        print("\n🔄 CIRCULAR DEPENDENCIES:")
        print("-" * 50)
        for i, cycle in enumerate(validation_result['circular_dependencies'], 1):
            print(f"  Cycle {i}: {' -> '.join(cycle)}")
            print()
    else:
        print("\n✅ No circular dependencies found!")
    
    # Core messaging analysis
    core_analysis = validation_result['core_messaging_analysis']
    print("\n🎯 CORE MESSAGING SYSTEM ANALYSIS:")
    print("-" * 50)
    
    if core_analysis['files_missing']:
        print("❌ Missing core files:")
        for file in core_analysis['files_missing']:
            print(f"   - {file}")
        print()
    
    if core_analysis['import_issues']:
        print("⚠️  Core files with import issues:")
        for issue in core_analysis['import_issues']:
            print(f"   📄 {issue['file']}")
            for broken in issue['broken_imports']:
                print(f"      ❌ Line {broken['line']}: {broken['import_path']}")
        print()
    
    if core_analysis['healthy_files']:
        print("✅ Healthy core files:")
        for file in core_analysis['healthy_files']:
            print(f"   ✓ {file}")
        print()
    
    print(f"Core files found: {len(core_analysis['files_found'])}")
    print(f"Core files missing: {len(core_analysis['files_missing'])}")
    print(f"Core files with issues: {len(core_analysis['import_issues'])}")

def main():
    shared_dir = "/Users/stephendeslate/Desktop/lifeplace-app/frontend/shared"
    
    if not os.path.exists(shared_dir):
        print(f"❌ Directory not found: {shared_dir}")
        return
    
    validator = ImportValidator(shared_dir)
    result = validator.validate_all()
    
    print_report(result)
    
    # Save detailed results to JSON
    output_file = Path(shared_dir) / "import_validation_report.json"
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"\n📊 Detailed results saved to: {output_file}")
    
    # Return appropriate exit code
    has_issues = (
        result['summary']['broken_imports_count'] > 0 or 
        result['summary']['circular_dependencies_count'] > 0 or
        len(result['core_messaging_analysis']['import_issues']) > 0
    )
    
    if has_issues:
        print("\n❌ Validation completed with issues found!")
        return 1
    else:
        print("\n✅ Validation completed successfully - no issues found!")
        return 0

if __name__ == "__main__":
    exit(main())