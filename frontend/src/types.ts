export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface FormDataField {
  key: string;
  value: string;
  type: 'text' | 'file';
  filePath: string;
  enabled: boolean;
  description?: string;
}

export interface RequestBodyConfig {
  type: 'none' | 'raw' | 'form-data' | 'x-www-form-urlencoded' | 'binary';
  raw?: string;
  rawType?: 'json' | 'xml' | 'text' | 'html' | 'javascript';
  formData?: FormDataField[];
  urlEncoded?: KeyValue[];
  binaryFilePath?: string;
}

export interface AuthSettings {
  type: 'none' | 'bearer' | 'basic' | 'api-key';
  bearer?: string;
  username?: string;
  password?: string;
  apiKey?: {
    key: string;
    value: string;
    addTo: 'header' | 'query';
  };
}

export interface ExecutionSettings {
  timeoutMs: number;
  followRedirects: boolean;
  maxRedirects: number;
  verifySSL: boolean;
  proxyUrl?: string;
  enableHttp2?: boolean;
  customCaCert?: string;
}

export interface TestResultItem {
  name: string;
  passed: boolean;
  error?: string;
}

export interface RequestItem {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  queryParams: KeyValue[];
  headers: KeyValue[];
  body: RequestBodyConfig;
  auth: AuthSettings;
  settings: ExecutionSettings;
  preRequestScript?: string;
  testScript?: string;
  variables?: Record<string, string>;
}

export interface TimingBreakdown {
  dnsLookupMs: number;
  tcpConnMs: number;
  tlsHandshakeMs: number;
  serverTimeMs: number;
  downloadTimeMs: number;
  totalDurationMs: number;
}

export interface CookieItem {
  name: string;
  value: string;
  path: string;
  domain: string;
  expires?: string;
  maxAge?: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: string;
}

export interface ResponseData {
  requestId: string;
  statusCode: number;
  statusText: string;
  proto: string;
  headers: KeyValue[];
  cookies: CookieItem[];
  body: string;
  contentType: string;
  size: number;
  headerSize: number;
  timeMs: number;
  timing: TimingBreakdown;
  isBinary: boolean;
  isTruncated: boolean;
  error?: string;
  testResults: TestResultItem[];
  scriptLogs: string[];
  updatedVariables?: Record<string, string>;
  redirectHistory: string[];
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];
}

export interface CollectionNode {
  id: string;
  name: string;
  type: 'folder' | 'request';
  request?: RequestItem;
  children?: CollectionNode[];
  description?: string;
}

export interface Collection {
  schemaVersion: string;
  id: string;
  name: string;
  description?: string;
  variables?: KeyValue[];
  auth?: AuthSettings;
  items: CollectionNode[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  request: RequestItem;
  response?: {
    statusCode: number;
    statusText: string;
    timeMs: number;
    size: number;
    error?: string;
    testResults?: TestResultItem[];
  };
}

export interface TabItem {
  id: string;
  title: string;
  request: RequestItem;
  response: ResponseData | null;
  isLoading: boolean;
  isDirty?: boolean;
}

export const createDefaultRequest = (name: string = 'Untitled Request'): RequestItem => ({
  id: 'req_' + Math.random().toString(36).substring(2, 9),
  name,
  method: 'GET',
  url: 'https://httpbin.org/get',
  queryParams: [
    { key: '', value: '', enabled: true }
  ],
  headers: [
    { key: 'Accept', value: '*/*', enabled: true },
    { key: 'User-Agent', value: 'Mels-API-Client/1.0', enabled: true }
  ],
  body: {
    type: 'none',
    raw: '{\n  "hello": "world"\n}',
    rawType: 'json',
    formData: [{ key: '', value: '', type: 'text', filePath: '', enabled: true }],
    urlEncoded: [{ key: '', value: '', enabled: true }]
  },
  auth: {
    type: 'none',
    apiKey: { key: 'X-API-KEY', value: '', addTo: 'header' }
  },
  settings: {
    timeoutMs: 30000,
    followRedirects: true,
    maxRedirects: 10,
    verifySSL: true,
    enableHttp2: true,
  },
  preRequestScript: `// Pre-request script runs before the HTTP request is executed\n// Example: mels.environment.set("timestamp", Date.now().toString());`,
  testScript: `// Test script runs after response is received\nmels.test("Status code is 200", function() {\n  mels.expect(mels.response.code).to.equal(200);\n});`,
});
