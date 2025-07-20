export interface TestSuite {
  id: string;
  name: string;
  description: string;
  category: 'compilation' | 'performance' | 'mobile' | 'yandex-sdk' | 'assets' | 'gameplay';
  priority: 'high' | 'medium' | 'low';
  timeout: number; // миллисекунды
  retries: number;
}

export interface TestCase {
  id: string;
  suiteId: string;
  name: string;
  description: string;
  input: any;
  expectedOutput?: any;
  validationRules: ValidationRule[];
  timeout: number;
  async: boolean;
}

export interface ValidationRule {
  id: string;
  name: string;
  type: 'exists' | 'matches' | 'range' | 'custom';
  target: string; // JSON path или селектор
  value?: any;
  min?: number;
  max?: number;
  pattern?: string;
  customValidator?: (value: any, context: TestContext) => boolean;
}

export interface TestContext {
  gameId: string;
  gameData: any;
  generatedFiles: Map<string, string>;
  buildResult?: any;
  performance?: PerformanceMetrics;
  startTime: Date;
  environment: 'development' | 'staging' | 'production';
}

export interface TestResult {
  testCaseId: string;
  status: 'passed' | 'failed' | 'skipped' | 'timeout' | 'error';
  duration: number;
  message?: string;
  details?: any;
  errors: TestError[];
  warnings: TestWarning[];
  metrics?: TestMetrics;
  screenshots?: string[]; // для UI тестов
  artifacts?: string[]; // пути к файлам
}

export interface TestError {
  code: string;
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  severity: 'critical' | 'major' | 'minor';
}

export interface TestWarning {
  code: string;
  message: string;
  suggestion?: string;
  impact: 'performance' | 'compatibility' | 'usability';
}

export interface TestMetrics {
  compilationTime?: number;
  bundleSize?: number;
  loadTime?: number;
  renderTime?: number;
  memoryUsage?: number;
  fps?: number;
  errorCount?: number;
  warningCount?: number;
  coverage?: number;
}

export interface TestReport {
  id: string;
  gameId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'passed' | 'failed' | 'partial';
  summary: TestSummary;
  suiteResults: Map<string, SuiteResult>;
  overallMetrics: TestMetrics;
  recommendations: string[];
  artifacts: string[];
}

export interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  warnings: number;
  successRate: number;
  criticalIssues: number;
}

export interface SuiteResult {
  suiteId: string;
  status: 'passed' | 'failed' | 'partial';
  duration: number;
  testResults: TestResult[];
  metrics: TestMetrics;
}

export interface TestConfiguration {
  environments: string[];
  browsers: string[];
  devices: DeviceConfig[];
  parallel: boolean;
  maxConcurrency: number;
  timeout: number;
  retries: number;
  coverage: boolean;
  screenshots: boolean;
  artifacts: boolean;
  reportFormats: ('json' | 'html' | 'xml' | 'junit')[];
}

export interface DeviceConfig {
  name: string;
  type: 'desktop' | 'tablet' | 'mobile';
  width: number;
  height: number;
  userAgent: string;
  pixelRatio: number;
}

export interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  memoryUsage: number;
  bundleSize: number;
  assetsSize: number;
  fps: number;
  criticalResourcesCount: number;
}

export interface GameTestScenario {
  id: string;
  name: string;
  description: string;
  gamePrompt: any;
  expectedOutcome: {
    shouldGenerate: boolean;
    minQuality: number;
    maxGenerationTime: number;
    requiredFeatures: string[];
    forbiddenContent: string[];
  };
  testSteps: TestStep[];
}

export interface TestStep {
  id: string;
  action: 'generate' | 'validate' | 'compile' | 'run' | 'measure' | 'interact';
  parameters: any;
  expectedResult: any;
  timeout: number;
}

export interface AutomatedTestRunner {
  runTest(testCase: TestCase, context: TestContext): Promise<TestResult>;
  runSuite(suite: TestSuite, context: TestContext): Promise<SuiteResult>;
  runScenario(scenario: GameTestScenario): Promise<TestReport>;
}

export interface DeviceProfile {
  id: string;
  name: string;
  type: 'mobile' | 'tablet' | 'desktop';
  os: 'ios' | 'android' | 'windows' | 'macos' | 'linux';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  viewport: {
    width: number;
    height: number;
  };
  capabilities: {
    touch: boolean;
    keyboard: boolean;
    gamepad: boolean;
    webgl: boolean;
    audio: boolean;
  };
  performance: {
    cpu: 'low' | 'medium' | 'high';
    memory: number; // MB
    gpu: 'integrated' | 'dedicated' | 'none';
  };
}

export interface DeviceTestResult {
  deviceProfile: DeviceProfile;
  testStartTime: Date;
  testEndTime: Date;
  duration: number;
  success: boolean;
  performance: {
    averageFps: number;
    memoryUsage: number;
    loadTime: number;
    errorCount: number;
  };
  compatibility: {
    rendering: boolean;
    input: boolean;
    audio: boolean;
    fullscreen: boolean;
  };
  errors: Array<{
    type: 'rendering' | 'script' | 'network' | 'input';
    message: string;
    timestamp: Date;
  }>;
  screenshots?: Array<{
    name: string;
    data: Buffer;
    timestamp: Date;
  }>;
}

export interface DeviceTestSuite {
  id: string;
  gameId: string;
  name: string;
  devices: DeviceProfile[];
  tests: Array<{
    id: string;
    name: string;
    description: string;
    type: 'compatibility' | 'performance' | 'ui' | 'gameplay';
    script: string;
  }>;
  configuration: {
    timeout: number;
    retries: number;
    screenshotsEnabled: boolean;
    performanceMonitoring: boolean;
  };
}

export interface DeviceTestReport {
  suiteId: string;
  gameId: string;
  executionId: string;
  startTime: Date;
  endTime: Date;
  summary: {
    totalDevices: number;
    passedDevices: number;
    failedDevices: number;
    averageScore: number;
  };
  results: DeviceTestResult[];
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: 'performance' | 'compatibility' | 'ux';
    message: string;
    devices: string[];
  }>;
} 