export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(`${response.url || 'Request'} failed with an empty response (${response.status})`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${response.url || 'Request'} returned invalid JSON (${response.status})`);
  }
}
