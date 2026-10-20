const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export function assertDbConfig() {
  if (!url || !token) {
    throw new Error(
      "Database belum dikonfigurasi. Set UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN di Vercel."
    );
  }
}

async function redis(command) {
  assertDbConfig();

  const response = await fetch(
    `${url}/${command.map(encodeURIComponent).join("/")}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok || !data || data.error) {
    throw new Error(data?.error || `Redis HTTP ${response.status}`);
  }

  return data.result;
}

export async function getLicense(key) {
  const result = await redis(["get", `license:${key}`]);

  if (result === null || result === undefined) return null;

  if (typeof result === "string") {
    try {
      return JSON.parse(result);
    } catch {
      throw new Error("Data license di database tidak valid.");
    }
  }

  return result;
}

export async function setLicense(key, value) {
  return redis(["set", `license:${key}`, JSON.stringify(value)]);
}
