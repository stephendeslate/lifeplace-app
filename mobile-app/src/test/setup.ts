/**
 * Jest Test Setup
 *
 * Global setup file for Jest tests. This file runs before each test file.
 * It configures mocks for React Native and Expo modules that don't work in Jest.
 */

import '@testing-library/jest-native/extend-expect';
import { cleanup } from '@testing-library/react-native';
import { server } from './mocks/server';

// =============================================================================
// MSW SERVER LIFECYCLE
// =============================================================================

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Close server after all tests
afterAll(() => server.close());

// =============================================================================
// CLEANUP
// =============================================================================

// Cleanup after each test
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

// =============================================================================
// EXPO MODULE MOCKS
// =============================================================================

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
    setParams: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  useSegments: () => [],
  useGlobalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Redirect: () => null,
  Stack: {
    Screen: () => null,
  },
  Tabs: {
    Screen: () => null,
  },
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `lifeplace://${path}`),
  openURL: jest.fn().mockResolvedValue(undefined),
  canOpenURL: jest.fn().mockResolvedValue(true),
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      apiUrl: 'http://localhost:8000/api',
      stripePublishableKey: 'pk_test_mock',
    },
  },
  manifest: null,
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: false,
  brand: 'Apple',
  modelName: 'iPhone 15',
  osName: 'iOS',
  osVersion: '17.0',
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-push-token' }),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setBadgeCountAsync: jest.fn().mockResolvedValue(true),
  getBadgeCountAsync: jest.fn().mockResolvedValue(0),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { MAX: 5 },
}));

// Mock expo-image
jest.mock('expo-image', () => ({
  Image: 'Image',
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  downloadAsync: jest.fn().mockResolvedValue({ uri: '/mock/download.pdf' }),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024 }),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue('mock-file-content'),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: '/mock/image.jpg', type: 'image', width: 100, height: 100 }],
  }),
  launchCameraAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: '/mock/camera.jpg', type: 'image', width: 100, height: 100 }],
  }),
  MediaTypeOptions: { Images: 'Images', Videos: 'Videos', All: 'All' },
}));

// Mock expo-document-picker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: '/mock/document.pdf', name: 'document.pdf', size: 1024 }],
  }),
}));

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
  supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1, 2]),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2 },
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// =============================================================================
// REACT NATIVE MOCKS
// =============================================================================

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    default: {
      call: jest.fn(),
      Value: jest.fn(),
      event: jest.fn(),
      add: jest.fn(),
      eq: jest.fn(),
      set: jest.fn(),
      cond: jest.fn(),
      interpolate: jest.fn(),
      Extrapolate: { CLAMP: 'clamp' },
      createAnimatedComponent: (component: unknown) => component,
    },
    View,
    Text: require('react-native').Text,
    ScrollView: require('react-native').ScrollView,
    FlatList: require('react-native').FlatList,
    useSharedValue: jest.fn((initial) => ({ value: initial })),
    useAnimatedStyle: jest.fn((fn) => fn()),
    withTiming: jest.fn((value) => value),
    withSpring: jest.fn((value) => value),
    withSequence: jest.fn((...values) => values[values.length - 1]),
    withDelay: jest.fn((_, value) => value),
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      in: jest.fn(),
      out: jest.fn(),
      inOut: jest.fn(),
    },
    useDerivedValue: jest.fn((fn) => ({ value: fn() })),
    useAnimatedRef: jest.fn(() => ({ current: null })),
    measure: jest.fn(),
    scrollTo: jest.fn(),
    cancelAnimation: jest.fn(),
  };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  const TouchableOpacity = require('react-native').TouchableOpacity;
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: TouchableOpacity,
    BorderlessButton: TouchableOpacity,
    FlatList: require('react-native').FlatList,
    gestureHandlerRootHOC: (Component: unknown) => Component,
    Directions: {},
    GestureDetector: View,
    Gesture: {
      Pan: () => ({ onStart: jest.fn(), onUpdate: jest.fn(), onEnd: jest.fn() }),
      Tap: () => ({ onStart: jest.fn(), onEnd: jest.fn() }),
      Pinch: () => ({}),
      Rotation: () => ({}),
    },
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
}));

// Mock react-native-screens
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  Screen: 'Screen',
  ScreenContainer: 'ScreenContainer',
  NativeScreen: 'NativeScreen',
  NativeScreenContainer: 'NativeScreenContainer',
}));

// Mock @shopify/flash-list
jest.mock('@shopify/flash-list', () => ({
  FlashList: require('react-native').FlatList,
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(undefined),
  multiRemove: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
}));

// Mock phosphor-react-native (icons)
jest.mock('phosphor-react-native', () => {
  const View = require('react-native').View;
  const createMockIcon = (name: string) => {
    const MockIcon = (props: Record<string, unknown>) =>
      require('react').createElement(View, { testID: `icon-${name}`, ...props });
    MockIcon.displayName = name;
    return MockIcon;
  };

  return new Proxy(
    {},
    {
      get: (_, prop) => createMockIcon(String(prop)),
    }
  );
});

// Mock @stripe/stripe-react-native
jest.mock('@stripe/stripe-react-native', () => ({
  StripeProvider: ({ children }: { children: React.ReactNode }) => children,
  useStripe: () => ({
    confirmPayment: jest.fn().mockResolvedValue({ paymentIntent: { id: 'pi_test' } }),
    createPaymentMethod: jest.fn().mockResolvedValue({ paymentMethod: { id: 'pm_test' } }),
    retrievePaymentIntent: jest.fn().mockResolvedValue({ paymentIntent: { id: 'pi_test' } }),
  }),
  usePaymentSheet: () => ({
    initPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
    presentPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
    loading: false,
  }),
  CardField: 'CardField',
}));

// Mock freerasp-react-native (security)
jest.mock('freerasp-react-native', () => ({
  Talsec: {
    start: jest.fn().mockResolvedValue(undefined),
    onThreatDetected: jest.fn(),
  },
  TalsecConfig: jest.fn(),
  Threat: {
    Hooks: 'hooks',
    Debug: 'debug',
    Passcode: 'passcode',
    Simulator: 'simulator',
    DeviceBinding: 'deviceBinding',
    OfficialStore: 'officialStore',
    Malware: 'malware',
    AppIntegrity: 'appIntegrity',
  },
}));

// =============================================================================
// CONSOLE SUPPRESSION
// =============================================================================

// Suppress specific console warnings in tests
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args: unknown[]) => {
  const message = args[0];
  if (typeof message === 'string') {
    // Suppress specific warnings
    if (
      message.includes('Animated: `useNativeDriver`') ||
      message.includes('componentWillReceiveProps') ||
      message.includes('componentWillMount')
    ) {
      return;
    }
  }
  originalWarn.apply(console, args);
};

console.error = (...args: unknown[]) => {
  const message = args[0];
  if (typeof message === 'string') {
    // Suppress specific errors that are expected in tests
    if (
      message.includes('Warning: ReactDOM.render') ||
      message.includes('act(...)') ||
      message.includes('Not implemented: navigation')
    ) {
      return;
    }
  }
  originalError.apply(console, args);
};

// =============================================================================
// GLOBAL TEST UTILITIES
// =============================================================================

// Global test user for convenience
declare global {
  // eslint-disable-next-line no-var
  var testUser: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    role: 'CLIENT' | 'ADMIN';
    is_active: boolean;
    date_joined: string;
  };
}

global.testUser = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  phone: '+639123456789',
  role: 'CLIENT',
  is_active: true,
  date_joined: '2024-01-01T00:00:00Z',
};
