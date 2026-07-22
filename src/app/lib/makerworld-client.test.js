import { MakerWorldClientAPIError, isDailyDownloadLimitError } from './makerworld-client';

describe('isDailyDownloadLimitError', () => {
  it('detects the real BambuLab daily-limit error shape', () => {
    const error = new MakerWorldClientAPIError({
      message: 'MakerWorld API error: 400 Bad Request',
      responseStatus: 400,
      responseBody: JSON.stringify({ code: -1, error: "You've reached your daily download limit." }),
    });
    expect(isDailyDownloadLimitError(error)).toBe(true);
  });

  it('is case-insensitive about the message wording', () => {
    const error = new MakerWorldClientAPIError({
      message: 'MakerWorld API error: 400 Bad Request',
      responseStatus: 400,
      responseBody: JSON.stringify({ code: -1, error: 'Daily Download Limit exceeded' }),
    });
    expect(isDailyDownloadLimitError(error)).toBe(true);
  });

  it('does not match an unrelated 400 error', () => {
    const error = new MakerWorldClientAPIError({
      message: 'MakerWorld API error: 400 Bad Request',
      responseStatus: 400,
      responseBody: JSON.stringify({ code: -2, error: 'Invalid design ID' }),
    });
    expect(isDailyDownloadLimitError(error)).toBe(false);
  });

  it('does not match the same message on a different status code', () => {
    const error = new MakerWorldClientAPIError({
      message: 'MakerWorld API error: 500 Internal Server Error',
      responseStatus: 500,
      responseBody: JSON.stringify({ code: -1, error: "You've reached your daily download limit." }),
    });
    expect(isDailyDownloadLimitError(error)).toBe(false);
  });

  it('does not match when there is no response body', () => {
    const error = new MakerWorldClientAPIError({
      message: 'MakerWorld API error: 400 Bad Request',
      responseStatus: 400,
    });
    expect(isDailyDownloadLimitError(error)).toBe(false);
  });

  it('does not match a plain Error', () => {
    expect(isDailyDownloadLimitError(new Error("You've reached your daily download limit."))).toBe(false);
  });
});
