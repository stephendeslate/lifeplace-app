# Design System Components

This directory contains the core components of the Modern Organic Luxury design system for the LifePlace Admin CRM application.

## Available Components

### ModernCard
A sophisticated card component that replaces heavy glassmorphism with clean, subtle elevation.

**Quick Start:**
```tsx
import { ModernCard } from '@/design-system';

<ModernCard variant="elevated" size="medium" hover>
  <Typography variant="h6">Card Title</Typography>
  <Typography>Card content</Typography>
</ModernCard>
```

**Documentation:**
- [Full Documentation](./ModernCard.md)
- [Examples](./ModernCard.examples.tsx)
- [Tests](./ModernCard.test.tsx)
- [Verification Report](./VERIFICATION.md)

**Features:**
- 6 variants: subtle, elevated, warm, terracotta, sage, outlined
- 3 sizes: small (16px), medium (24px), large (32px)
- Hover animations with elevation changes
- Clickable state with keyboard accessibility
- Full design token integration
- Migration utility from GlassCard

---

## Component Architecture

### Design Principles
All components in this directory follow these principles:

1. **Design Token Integration**: No hardcoded values - all styles use design tokens
2. **TypeScript First**: Full type safety with exported interfaces
3. **Accessibility**: WCAG compliant with keyboard navigation
4. **Performance**: GPU-accelerated animations, optimized rendering
5. **Responsive**: Works on all screen sizes
6. **Testable**: Comprehensive test coverage

### File Structure
Each component follows this structure:

```
ComponentName/
  ComponentName.tsx         # Main component implementation
  ComponentName.test.tsx    # Test suite
  ComponentName.md          # Documentation
  ComponentName.examples.tsx # Usage examples
```

Or flat structure (current):
```
ComponentName.tsx         # Main component
ComponentName.test.tsx    # Tests
ComponentName.md          # Docs
ComponentName.examples.tsx # Examples
```

---

## Development Guidelines

### Creating New Components

1. **Use Design Tokens**
   ```tsx
   import { tokens } from '../tokens';

   const styles = {
     padding: tokens.spacing.space[4],
     borderRadius: tokens.spacing.radius.xxl,
     boxShadow: tokens.shadow.component.card,
   };
   ```

2. **TypeScript Interfaces**
   ```tsx
   export interface ComponentNameProps {
     variant?: 'primary' | 'secondary';
     size?: 'small' | 'medium' | 'large';
     children: React.ReactNode;
     sx?: SxProps<Theme>;
   }
   ```

3. **Export Types**
   ```tsx
   export type ComponentVariant = 'primary' | 'secondary';
   export { ComponentName };
   export default ComponentName;
   ```

4. **Write Tests**
   - Test all variants and sizes
   - Test interactive states (hover, click, keyboard)
   - Test accessibility (roles, tabIndex, aria-*)
   - Aim for >80% coverage

5. **Document Thoroughly**
   - API reference with all props
   - Usage examples (at least 5)
   - Design token reference
   - Accessibility notes
   - Migration guides (if replacing existing component)

---

## Testing

Run all component tests:
```bash
npm run test
```

Run specific component tests:
```bash
npm run test -- ComponentName.test.tsx
```

Run tests in watch mode:
```bash
npm run test:watch
```

---

## Building

TypeScript check:
```bash
npm run type-check
```

Build the application:
```bash
npm run build
```

---

## Importing Components

### From Within the App
```tsx
import { ModernCard } from '@/design-system';
import type { ModernCardProps } from '@/design-system';
```

### From Design System Files
```tsx
import { ModernCard } from './components';
import { tokens } from './tokens';
```

---

## Component Status

| Component | Status | Version | Tests | Docs |
|-----------|--------|---------|-------|------|
| ModernCard | ✅ Complete | 1.0.0 | 22/22 ✅ | Complete ✅ |

### Legend
- ✅ Complete: Fully implemented, tested, and documented
- 🚧 In Progress: Currently being developed
- 📝 Planned: Scheduled for future development
- 🔄 Migrating: Being migrated from legacy component

---

## Design Token Usage

All components use the centralized design tokens from `/design-system/tokens/`:

- **colors.ts**: Color palette, semantic colors, glassmorphism colors
- **typography.ts**: Font families, sizes, weights, line heights
- **spacing.ts**: Spacing scale, radii, container sizes, z-index
- **shadows.ts**: Elevation shadows, glassmorphism shadows, component shadows
- **animations.ts**: Transitions, durations, easing functions

**Example:**
```tsx
import { tokens } from '@/design-system';

const cardStyles = {
  backgroundColor: tokens.color.neutral[50],
  borderRadius: tokens.spacing.radius.xxl,
  boxShadow: tokens.shadow.component.card,
  padding: tokens.spacing.space[6],
  transition: tokens.animation.transitions.card,
};
```

---

## Accessibility Standards

All components must meet WCAG 2.1 Level AA standards:

### Required Features
- ✅ Semantic HTML elements
- ✅ Proper ARIA roles and attributes
- ✅ Keyboard navigation support
- ✅ Focus management
- ✅ Color contrast ratios (4.5:1 minimum)
- ✅ Screen reader compatibility
- ✅ Touch target sizes (44x44px minimum)

### Testing Checklist
- [ ] Tab navigation works
- [ ] Enter/Space keys trigger actions
- [ ] Focus indicators visible
- [ ] Screen reader announces correctly
- [ ] No keyboard traps
- [ ] Color not sole indicator of meaning

---

## Performance Best Practices

### Optimizations Used
1. **GPU Acceleration**: Use `transform` instead of `top/left` for animations
2. **CSS Transitions**: Prefer CSS over JavaScript animations
3. **Memoization**: Use `React.memo` for expensive components
4. **Code Splitting**: Import components lazily when possible
5. **Token Compilation**: All design tokens computed at build time

### What to Avoid
- ❌ Inline function definitions in render
- ❌ Large bundle sizes (keep components <100KB)
- ❌ Unnecessary re-renders
- ❌ Heavy computations in render
- ❌ Direct DOM manipulation

---

## Contributing

### Adding a New Component

1. Create component file: `ComponentName.tsx`
2. Create test file: `ComponentName.test.tsx`
3. Create documentation: `ComponentName.md`
4. Create examples: `ComponentName.examples.tsx`
5. Export from `index.ts`
6. Update this README with component status
7. Run tests: `npm run test -- ComponentName.test.tsx`
8. Type check: `npm run type-check`
9. Build: `npm run build`

### Code Review Checklist
- [ ] Uses design tokens (no hardcoded values)
- [ ] TypeScript types exported
- [ ] All props documented
- [ ] Tests written (coverage >80%)
- [ ] Accessibility tested
- [ ] Examples provided
- [ ] Documentation complete
- [ ] No console errors/warnings
- [ ] Build passes
- [ ] Tests pass

---

## Related Documentation

- [Design System Overview](../DESIGN_SYSTEM.md)
- [Token Reference](../tokens/README.md)
- [Theme Configuration](../theme/modernTheme.ts)
- [MUI Integration](../utils/responsive.ts)

---

## Version History

### v1.0.0 (2026-01-22)
- Initial design system components release
- Added ModernCard component
- Established component architecture
- Created testing framework
- Documented development guidelines

---

**Maintained by**: LifePlace Development Team
**Design System**: Modern Organic Luxury
**Last Updated**: 2026-01-22
