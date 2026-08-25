import { Environment, KeyValue, RequestItem } from '../types';

/**
 * Replace {{variableName}} templates with values from active environment and collection variables.
 */
export function interpolateString(
  template: string,
  variables: Record<string, string>
): string {
  if (!template) return template;
  return template.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, key) => {
    if (key in variables) {
      return variables[key];
    }
    return match;
  });
}

/**
 * Builds a variable map from active environment and collection variables.
 */
export function buildVariableMap(
  environment?: Environment | null,
  collectionVariables?: KeyValue[]
): Record<string, string> {
  const map: Record<string, string> = {};

  // 1. Add collection variables
  if (collectionVariables) {
    for (const v of collectionVariables) {
      if (v.enabled && v.key) {
        map[v.key] = v.value;
      }
    }
  }

  // 2. Override with active environment variables (higher precedence)
  if (environment && environment.variables) {
    for (const v of environment.variables) {
      if (v.enabled && v.key) {
        map[v.key] = v.value;
      }
    }
  }

  return map;
}

/**
 * Resolves all variables in an ApiRequest before sending it to the Go backend.
 */
export function resolveRequestVariables(
  req: RequestItem,
  variables: Record<string, string>
): RequestItem {
  const resolved: RequestItem = JSON.parse(JSON.stringify(req));

  // Resolve URL
  resolved.url = interpolateString(resolved.url, variables);

  // Resolve Query Params
  if (resolved.queryParams) {
    resolved.queryParams = resolved.queryParams.map(qp => ({
      ...qp,
      key: interpolateString(qp.key, variables),
      value: interpolateString(qp.value, variables),
    }));
  }

  // Resolve Headers
  if (resolved.headers) {
    resolved.headers = resolved.headers.map(h => ({
      ...h,
      key: interpolateString(h.key, variables),
      value: interpolateString(h.value, variables),
    }));
  }

  // Resolve Body
  if (resolved.body) {
    if (resolved.body.type === 'raw' && resolved.body.raw) {
      resolved.body.raw = interpolateString(resolved.body.raw, variables);
    } else if (resolved.body.type === 'x-www-form-urlencoded' && resolved.body.urlEncoded) {
      resolved.body.urlEncoded = resolved.body.urlEncoded.map(item => ({
        ...item,
        key: interpolateString(item.key, variables),
        value: interpolateString(item.value, variables),
      }));
    } else if (resolved.body.type === 'form-data' && resolved.body.formData) {
      resolved.body.formData = resolved.body.formData.map(item => ({
        ...item,
        key: interpolateString(item.key, variables),
        value: item.type === 'text' ? interpolateString(item.value, variables) : item.value,
      }));
    }
  }

  // Resolve Auth
  if (resolved.auth) {
    if (resolved.auth.type === 'bearer' && resolved.auth.bearer) {
      resolved.auth.bearer = interpolateString(resolved.auth.bearer, variables);
    } else if (resolved.auth.type === 'basic') {
      if (resolved.auth.username) resolved.auth.username = interpolateString(resolved.auth.username, variables);
      if (resolved.auth.password) resolved.auth.password = interpolateString(resolved.auth.password, variables);
    } else if (resolved.auth.type === 'api-key' && resolved.auth.apiKey) {
      resolved.auth.apiKey.key = interpolateString(resolved.auth.apiKey.key, variables);
      resolved.auth.apiKey.value = interpolateString(resolved.auth.apiKey.value, variables);
    }
  }

  return resolved;
}
