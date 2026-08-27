export namespace main {
	
	export class ApiKeyConfig {
	    key: string;
	    value: string;
	    addTo: string;
	
	    static createFrom(source: any = {}) {
	        return new ApiKeyConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.value = source["value"];
	        this.addTo = source["addTo"];
	    }
	}
	export class RequestSettings {
	    timeoutMs: number;
	    followRedirects: boolean;
	    maxRedirects: number;
	    verifySSL: boolean;
	    proxyUrl?: string;
	    enableHttp2: boolean;
	    customCaCert?: string;
	
	    static createFrom(source: any = {}) {
	        return new RequestSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timeoutMs = source["timeoutMs"];
	        this.followRedirects = source["followRedirects"];
	        this.maxRedirects = source["maxRedirects"];
	        this.verifySSL = source["verifySSL"];
	        this.proxyUrl = source["proxyUrl"];
	        this.enableHttp2 = source["enableHttp2"];
	        this.customCaCert = source["customCaCert"];
	    }
	}
	export class AuthConfig {
	    type: string;
	    bearer?: string;
	    username?: string;
	    password?: string;
	    apiKey?: ApiKeyConfig;
	
	    static createFrom(source: any = {}) {
	        return new AuthConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.bearer = source["bearer"];
	        this.username = source["username"];
	        this.password = source["password"];
	        this.apiKey = this.convertValues(source["apiKey"], ApiKeyConfig);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class FormDataItem {
	    key: string;
	    value: string;
	    type: string;
	    filePath: string;
	    enabled: boolean;
	    description?: string;
	
	    static createFrom(source: any = {}) {
	        return new FormDataItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.value = source["value"];
	        this.type = source["type"];
	        this.filePath = source["filePath"];
	        this.enabled = source["enabled"];
	        this.description = source["description"];
	    }
	}
	export class RequestBody {
	    type: string;
	    raw?: string;
	    rawType?: string;
	    formData?: FormDataItem[];
	    urlEncoded?: KeyValuePair[];
	    binaryFilePath?: string;
	
	    static createFrom(source: any = {}) {
	        return new RequestBody(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.raw = source["raw"];
	        this.rawType = source["rawType"];
	        this.formData = this.convertValues(source["formData"], FormDataItem);
	        this.urlEncoded = this.convertValues(source["urlEncoded"], KeyValuePair);
	        this.binaryFilePath = source["binaryFilePath"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class KeyValuePair {
	    key: string;
	    value: string;
	    enabled: boolean;
	    description?: string;
	
	    static createFrom(source: any = {}) {
	        return new KeyValuePair(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.value = source["value"];
	        this.enabled = source["enabled"];
	        this.description = source["description"];
	    }
	}
	export class ApiRequest {
	    id: string;
	    name: string;
	    method: string;
	    url: string;
	    queryParams: KeyValuePair[];
	    headers: KeyValuePair[];
	    body: RequestBody;
	    auth: AuthConfig;
	    settings: RequestSettings;
	    preRequestScript?: string;
	    testScript?: string;
	    variables?: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new ApiRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.method = source["method"];
	        this.url = source["url"];
	        this.queryParams = this.convertValues(source["queryParams"], KeyValuePair);
	        this.headers = this.convertValues(source["headers"], KeyValuePair);
	        this.body = this.convertValues(source["body"], RequestBody);
	        this.auth = this.convertValues(source["auth"], AuthConfig);
	        this.settings = this.convertValues(source["settings"], RequestSettings);
	        this.preRequestScript = source["preRequestScript"];
	        this.testScript = source["testScript"];
	        this.variables = source["variables"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TestResult {
	    name: string;
	    passed: boolean;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new TestResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.passed = source["passed"];
	        this.error = source["error"];
	    }
	}
	export class RequestTiming {
	    dnsLookupMs: number;
	    tcpConnMs: number;
	    tlsHandshakeMs: number;
	    serverTimeMs: number;
	    downloadTimeMs: number;
	    totalDurationMs: number;
	    connReused: boolean;
	
	    static createFrom(source: any = {}) {
	        return new RequestTiming(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.dnsLookupMs = source["dnsLookupMs"];
	        this.tcpConnMs = source["tcpConnMs"];
	        this.tlsHandshakeMs = source["tlsHandshakeMs"];
	        this.serverTimeMs = source["serverTimeMs"];
	        this.downloadTimeMs = source["downloadTimeMs"];
	        this.totalDurationMs = source["totalDurationMs"];
	        this.connReused = source["connReused"];
	    }
	}
	export class ResponseCookie {
	    name: string;
	    value: string;
	    path: string;
	    domain: string;
	    expires?: string;
	    maxAge?: number;
	    secure: boolean;
	    httpOnly: boolean;
	    sameSite?: string;
	
	    static createFrom(source: any = {}) {
	        return new ResponseCookie(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.value = source["value"];
	        this.path = source["path"];
	        this.domain = source["domain"];
	        this.expires = source["expires"];
	        this.maxAge = source["maxAge"];
	        this.secure = source["secure"];
	        this.httpOnly = source["httpOnly"];
	        this.sameSite = source["sameSite"];
	    }
	}
	export class ApiResponse {
	    requestId: string;
	    statusCode: number;
	    statusText: string;
	    proto: string;
	    headers: KeyValuePair[];
	    cookies: ResponseCookie[];
	    body: string;
	    contentType: string;
	    size: number;
	    headerSize: number;
	    timeMs: number;
	    timing: RequestTiming;
	    isBinary: boolean;
	    isTruncated: boolean;
	    error?: string;
	    testResults: TestResult[];
	    scriptLogs: string[];
	    updatedVariables?: Record<string, string>;
	    redirectHistory: string[];
	
	    static createFrom(source: any = {}) {
	        return new ApiResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.requestId = source["requestId"];
	        this.statusCode = source["statusCode"];
	        this.statusText = source["statusText"];
	        this.proto = source["proto"];
	        this.headers = this.convertValues(source["headers"], KeyValuePair);
	        this.cookies = this.convertValues(source["cookies"], ResponseCookie);
	        this.body = source["body"];
	        this.contentType = source["contentType"];
	        this.size = source["size"];
	        this.headerSize = source["headerSize"];
	        this.timeMs = source["timeMs"];
	        this.timing = this.convertValues(source["timing"], RequestTiming);
	        this.isBinary = source["isBinary"];
	        this.isTruncated = source["isTruncated"];
	        this.error = source["error"];
	        this.testResults = this.convertValues(source["testResults"], TestResult);
	        this.scriptLogs = source["scriptLogs"];
	        this.updatedVariables = source["updatedVariables"];
	        this.redirectHistory = source["redirectHistory"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	
	
	
	

}

