export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delays = [200, 800, 2000]
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        const delay = delays[attempt] || delays[delays.length - 1];
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
  throw lastError;
}
