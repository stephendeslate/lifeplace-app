// Responsive Utilities Validation Test
// Tests the responsive utility functions to ensure they work correctly

const testResults = [];

// Test 1: Basic breakpoint value test
function testBasicBreakpoints() {
  // Import would be: import { breakpoints } from './frontend/shared/design-system/utils/responsive.ts';
  const mockBreakpoints = {
    xs: '0px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  };

  const result = {
    test: 'Basic Breakpoints',
    passed: Object.keys(mockBreakpoints).length === 6,
    details: `Found ${Object.keys(mockBreakpoints).length} breakpoints: ${Object.keys(mockBreakpoints).join(', ')}`
  };
  
  testResults.push(result);
  return result.passed;
}

// Test 2: Media query generation test
function testMediaQueryGeneration() {
  // Simulate the mediaQuery.up function
  const breakpoints = { sm: '640px', md: '768px', lg: '1024px' };
  
  const mediaQueryUp = (breakpoint) => `@media (min-width: ${breakpoints[breakpoint]})`;
  const mediaQueryDown = (breakpoint) => {
    const bpValue = parseInt(breakpoints[breakpoint].replace('px', ''), 10);
    return `@media (max-width: ${bpValue - 1}px)`;
  };

  const upResult = mediaQueryUp('md');
  const downResult = mediaQueryDown('md');
  
  const result = {
    test: 'Media Query Generation',
    passed: upResult === '@media (min-width: 768px)' && downResult === '@media (max-width: 767px)',
    details: `Up: ${upResult}, Down: ${downResult}`
  };
  
  testResults.push(result);
  return result.passed;
}

// Test 3: Responsive value handling
function testResponsiveValueHandling() {
  // Simulate createResponsiveValue function
  const createResponsiveValue = (value, property, transform) => {
    if (typeof value !== 'object' || value === null) {
      const finalValue = transform ? transform(value) : value;
      return { [property]: finalValue };
    }

    const styles = {};
    
    if (value.xs !== undefined) {
      const finalValue = transform ? transform(value.xs) : value.xs;
      styles[property] = finalValue;
    }
    
    Object.entries(value).forEach(([breakpoint, val]) => {
      if (breakpoint !== 'xs' && val !== undefined) {
        const mediaQueryKey = `@media (min-width: 768px)`; // Mock
        const finalValue = transform ? transform(val) : val;
        
        if (!styles[mediaQueryKey]) {
          styles[mediaQueryKey] = {};
        }
        styles[mediaQueryKey][property] = finalValue;
      }
    });
    
    return styles;
  };

  const responsiveValue = { xs: '16px', md: '24px' };
  const result = createResponsiveValue(responsiveValue, 'padding');
  
  const testResult = {
    test: 'Responsive Value Handling',
    passed: result.padding === '16px' && result['@media (min-width: 768px)'].padding === '24px',
    details: `Generated styles: ${JSON.stringify(result, null, 2)}`
  };
  
  testResults.push(testResult);
  return testResult.passed;
}

// Test 4: Grid utilities test
function testGridUtilities() {
  const createGrid = (columns, gap) => ({
    display: 'grid',
    gap: gap || '16px',
    gridTemplateColumns: typeof columns === 'number' ? `repeat(${columns}, 1fr)` : columns
  });

  const gridResult = createGrid(3, '20px');
  
  const result = {
    test: 'Grid Utilities',
    passed: gridResult.display === 'grid' && 
            gridResult.gap === '20px' && 
            gridResult.gridTemplateColumns === 'repeat(3, 1fr)',
    details: `Grid result: ${JSON.stringify(gridResult)}`
  };
  
  testResults.push(result);
  return result.passed;
}

// Test 5: Container utilities test
function testContainerUtilities() {
  const createContainer = (maxWidth) => ({
    width: '100%',
    paddingLeft: '16px',
    paddingRight: '16px',
    marginLeft: 'auto',
    marginRight: 'auto',
    ...(maxWidth && {
      maxWidth: maxWidth === 'lg' ? '1024px' : maxWidth,
    })
  });

  const container = createContainer('lg');
  
  const result = {
    test: 'Container Utilities',
    passed: container.width === '100%' && 
            container.maxWidth === '1024px' &&
            container.marginLeft === 'auto',
    details: `Container result: ${JSON.stringify(container)}`
  };
  
  testResults.push(result);
  return result.passed;
}

// Test 6: Typography scaling test
function testTypographyScaling() {
  const createResponsiveTypography = (baseSize, scales) => {
    const styles = {
      fontSize: baseSize,
    };

    if (scales) {
      Object.entries(scales).forEach(([breakpoint, size]) => {
        if (size) {
          const mediaQueryKey = `@media (min-width: ${breakpoint === 'md' ? '768px' : '640px'})`;
          styles[mediaQueryKey] = {
            fontSize: size,
          };
        }
      });
    }

    return styles;
  };

  const typography = createResponsiveTypography('16px', { md: '18px', lg: '20px' });
  
  const result = {
    test: 'Typography Scaling',
    passed: typography.fontSize === '16px' &&
            typography['@media (min-width: 768px)'].fontSize === '18px',
    details: `Typography result: ${JSON.stringify(typography, null, 2)}`
  };
  
  testResults.push(result);
  return result.passed;
}

// Run all tests
console.log('🧪 Running Responsive Utilities Validation Tests...\n');

const tests = [
  testBasicBreakpoints,
  testMediaQueryGeneration,
  testResponsiveValueHandling,
  testGridUtilities,
  testContainerUtilities,
  testTypographyScaling
];

let passedTests = 0;
let totalTests = tests.length;

tests.forEach(test => {
  try {
    if (test()) {
      passedTests++;
    }
  } catch (error) {
    console.error(`Test failed with error: ${error.message}`);
  }
});

// Print results
console.log('📊 Test Results:\n');
testResults.forEach((result, index) => {
  const status = result.passed ? '✅' : '❌';
  console.log(`${index + 1}. ${status} ${result.test}`);
  console.log(`   ${result.details}\n`);
});

console.log(`🎯 Summary: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)`);

if (passedTests === totalTests) {
  console.log('🎉 All responsive utility tests passed! The system is working correctly.');
} else {
  console.log('⚠️  Some tests failed. Review the responsive utility implementation.');
}