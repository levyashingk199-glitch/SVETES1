// Самопинг: бесплатные хостинги (Render и др.) усыпляют сервис после ~15 мин без запросов.
// Пока сервис проснулся, он сам обращается к своему публичному URL и не засыпает.
// Разбудить уже уснувший сервис может только внешний пинг (GitHub Actions / UptimeRobot).
export const startKeepAlive = () => {
  const base = process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!base) return;
  const url = `${base.replace(/\/$/, '')}/api/health`;
  const every = Number(process.env.KEEP_ALIVE_INTERVAL_MS) || 10 * 60 * 1000;

  const ping = async () => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      console.log(`[keep-alive] ${url} -> ${res.status}`);
    } catch (e) {
      console.warn(`[keep-alive] ping failed: ${e.message}`);
    }
  };
  setInterval(ping, every).unref();
  console.log(`[keep-alive] enabled, every ${Math.round(every / 60000)} min -> ${url}`);
};
