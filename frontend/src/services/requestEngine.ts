import { RequestItem, ResponseData, TestResultItem } from '../types';
import { ExecuteRequest, CancelRequest } from '../../wailsjs/go/main/App';

// Map of active AbortControllers keyed by request ID for fallback mode
const activeAbortControllers = new Map<string, AbortController>();

export async function cancelRequest(requestId: string): Promise<boolean> {
  const controller = activeAbortControllers.get(requestId);
  if (controller) {
    controller.abort();
    activeAbortControllers.delete(requestId);
    return true;
  }
  if (typeof CancelRequest === 'function') {
    return await CancelRequest(requestId);
  }
  return false;
}

export async function executeRequest(req: RequestItem): Promise<ResponseData> {
  // If running in Wails desktop app, use Go's native OS HTTP engine (zero CORS, full headers, Keep-Alive, proxy, SSL)
  if (typeof ExecuteRequest === 'function') {
    try {
      const rawResp = await ExecuteRequest(req as any);
      const responseData: ResponseData = {
        requestId: rawResp.requestId || req.id,
        statusCode: rawResp.statusCode || 0,
        statusText: rawResp.statusText || (rawResp.statusCode === 200 ? 'OK' : ''),
        proto: rawResp.proto || 'HTTP/1.1',
        headers: rawResp.headers || [],
        cookies: rawResp.cookies || [],
        body: rawResp.body || '',
        contentType: rawResp.contentType || '',
        size: rawResp.size || 0,
        headerSize: rawResp.headerSize || 0,
        timeMs: rawResp.timeMs || 0,
        timing: rawResp.timing || {
          dnsLookupMs: 0,
          tcpConnMs: 0,
          tlsHandshakeMs: 0,
          serverTimeMs: rawResp.timeMs || 0,
          downloadTimeMs: 0,
          totalDurationMs: rawResp.timeMs || 0,
        },
        isBinary: rawResp.isBinary || false,
        isTruncated: rawResp.isTruncated || false,
        error: rawResp.error || undefined,
        testResults: rawResp.testResults || [],
        scriptLogs: rawResp.scriptLogs || [],
        updatedVariables: rawResp.updatedVariables,
        redirectHistory: rawResp.redirectHistory || [],
      };
      return responseData;
    } catch (e: any) {
      console.warn('Go ExecuteRequest failed, falling back to browser fetch:', e);
    }
  }

  // Fallback to fetch()
  return await executeFetchFallback(req);
}

// Browser fetch fallback implementation
async function executeFetchFallback(req: RequestItem): Promise<ResponseData> {
  const logs: string[] = [];
  const testResults: TestResultItem[] = [];
  const updatedVariables: Record<string, string> = { ...(req.variables || {}) };

  let finalUrl = req.url.trim();
  if (!finalUrl) {
    return {
      requestId: req.id,
      statusCode: 0,
      statusText: 'Client Error',
      proto: 'HTTP/1.1',
      headers: [],
      cookies: [],
      body: '',
      contentType: '',
      size: 0,
      headerSize: 0,
      timeMs: 0,
      timing: {
        dnsLookupMs: 0,
        tcpConnMs: 0,
        tlsHandshakeMs: 0,
        serverTimeMs: 0,
        downloadTimeMs: 0,
        totalDurationMs: 0,
      },
      isBinary: false,
      isTruncated: false,
      error: 'URL cannot be empty',
      testResults: [],
      scriptLogs: logs,
      updatedVariables,
      redirectHistory: [],
    };
  }

  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
    finalUrl = 'http://' + finalUrl;
  }

  const urlObj = new URL(finalUrl);
  (req.queryParams || []).forEach((qp) => {
    if (qp.enabled && qp.key) {
      urlObj.searchParams.append(qp.key, qp.value);
    }
  });

  const headers = new Headers();
  (req.headers || []).forEach((h) => {
    if (h.enabled && h.key) {
      headers.set(h.key, h.value);
    }
  });

  const method = req.method.toUpperCase();
  let fetchBody: any = null;
  if (method !== 'GET' && method !== 'HEAD') {
    if (req.body.type === 'raw') {
      fetchBody = req.body.raw || '';
    } else if (req.body.type === 'x-www-form-urlencoded') {
      const urlParams = new URLSearchParams();
      (req.body.urlEncoded || []).forEach((item) => {
        if (item.enabled && item.key) urlParams.append(item.key, item.value);
      });
      fetchBody = urlParams.toString();
    }
  }

  const controller = new AbortController();
  activeAbortControllers.set(req.id, controller);

  const tStart = performance.now();
  try {
    const fetchResponse = await fetch(urlObj.toString(), {
      method: method,
      headers: headers,
      body: fetchBody,
      signal: controller.signal,
      mode: 'cors',
    });
    const tEnd = performance.now();
    activeAbortControllers.delete(req.id);

    const bodyText = await fetchResponse.text();
    const duration = Math.round(tEnd - tStart);

    const parsedHeaders: { key: string; value: string; enabled: boolean }[] = [];
    fetchResponse.headers.forEach((val, key) => {
      parsedHeaders.push({ key, value: val, enabled: true });
    });

    return {
      requestId: req.id,
      statusCode: fetchResponse.status,
      statusText: fetchResponse.statusText || 'OK',
      proto: 'HTTP/1.1',
      headers: parsedHeaders,
      cookies: [],
      body: bodyText,
      contentType: fetchResponse.headers.get('content-type') || '',
      size: new Blob([bodyText]).size,
      headerSize: 0,
      timeMs: duration,
      timing: {
        dnsLookupMs: 0,
        tcpConnMs: 0,
        tlsHandshakeMs: 0,
        serverTimeMs: duration,
        downloadTimeMs: 0,
        totalDurationMs: duration,
      },
      isBinary: false,
      isTruncated: false,
      testResults: testResults,
      scriptLogs: logs,
      updatedVariables: updatedVariables,
      redirectHistory: [],
    };
  } catch (err: any) {
    activeAbortControllers.delete(req.id);
    const duration = Math.round(performance.now() - tStart);
    return {
      requestId: req.id,
      statusCode: 0,
      statusText: 'Error',
      proto: 'HTTP/1.1',
      headers: [],
      cookies: [],
      body: '',
      contentType: '',
      size: 0,
      headerSize: 0,
      timeMs: duration,
      timing: {
        dnsLookupMs: 0,
        tcpConnMs: 0,
        tlsHandshakeMs: 0,
        serverTimeMs: duration,
        downloadTimeMs: 0,
        totalDurationMs: duration,
      },
      isBinary: false,
      isTruncated: false,
      error: err.message || 'Request failed',
      testResults: [],
      scriptLogs: logs,
      updatedVariables: updatedVariables,
      redirectHistory: [],
    };
  }
}
