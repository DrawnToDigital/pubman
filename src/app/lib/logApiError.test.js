import { formatApiError } from './logApiError';

describe('formatApiError', () => {
  it('renders a plain Error as just its message', () => {
    expect(formatApiError(new Error('boom'))).toBe('boom');
  });

  it('surfaces diagnostic properties attached to an Error', () => {
    const error = new Error('Printables API error: https://api.printables.com/graphql/ 401 Unauthorized');
    error.url = 'https://api.printables.com/graphql/';
    error.method = 'POST';
    error.requestBody = { id: '1783880', loadPurchase: false };
    error.responseStatus = 401;
    error.responseStatusText = 'Unauthorized';
    error.responseBody = '{"errors":[{"message":"tag contains invalid characters"}]}';

    const formatted = formatApiError(error);
    expect(formatted).toContain('Printables API error');
    expect(formatted).toContain('url=https://api.printables.com/graphql/');
    expect(formatted).toContain('method=POST');
    expect(formatted).toContain('requestBody={"id":"1783880","loadPurchase":false}');
    expect(formatted).toContain('responseStatus=401');
    expect(formatted).toContain('responseStatusText=Unauthorized');
    expect(formatted).toContain('responseBody={"errors":[{"message":"tag contains invalid characters"}]}');
  });

  it('omits keys that are absent, without producing "undefined"/"null" noise', () => {
    const error = new Error('MakerWorld API error');
    error.responseStatus = 500;
    const formatted = formatApiError(error);
    expect(formatted).toBe('MakerWorld API error | responseStatus=500');
    expect(formatted).not.toMatch(/undefined|null/);
  });

  it('handles a MakerWorldAPIError-shaped object (constructed via Object.assign, not a subclass)', () => {
    const error = Object.assign(new Error('MakerWorld API error'), {
      name: 'MakerWorldAPIError',
      url: 'https://api.bambulab.com/v1/design-service/my/draft',
      method: 'POST',
      responseStatus: 400,
      responseStatusText: 'Bad Request',
      responseBody: '{"code":-1,"error":"validation failed"}',
      validationIssues: [{ path: 'tags', message: 'invalid character' }],
    });

    const formatted = formatApiError(error);
    expect(formatted).toContain('validationIssues=[{"path":"tags","message":"invalid character"}]');
  });

  it('JSON-stringifies non-Error values rather than relying on default serialization', () => {
    expect(formatApiError({ status: 500, body: 'oops' })).toBe('{"status":500,"body":"oops"}');
  });

  it('passes strings through unchanged', () => {
    expect(formatApiError('plain string error')).toBe('plain string error');
  });

  it('stringifies null/undefined without throwing', () => {
    expect(formatApiError(null)).toBe('null');
    expect(formatApiError(undefined)).toBe('undefined');
  });
});
