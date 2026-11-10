const USER_AGENT = "Apestock/1.0 (https://github.com/roxelfivan/Apestock)";

export async function fetchText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, ...headers },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return text;
}

export async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const text = await fetchText(url, { accept: "application/json", ...headers });
  return JSON.parse(text) as T;
}
