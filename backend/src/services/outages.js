import { Outage, Confirmation } from '../models/index.js';
import { dbReady } from '../config/db.js';
import { TYPES, STATUSES, esc } from '../utils/helpers.js';
export const buildFilter = (q = {}, types = TYPES) => {
  const f = { type: { $in: types } };
  if (TYPES.includes(q.type) && types.includes(q.type)) f.type = q.type;
  if (STATUSES.includes(q.status)) f.status = q.status;
  if (q.q) { const r = { $regex: esc(q.q), $options: 'i' }; f.$or = [{ description: r }, { address: r }]; }
  return f;
};
export const summary = async types => {
  const rows = await Outage.aggregate([{ $match: { type: { $in: types } } }, { $group: { _id: '$status', n: { $sum: 1 }, c: { $sum: '$confirmations' } } }]);
  const s = { pending: 0, confirmed: 0, resolved: 0, confirmations: 0 };
  rows.forEach(r => { s[r._id] = r.n; s.confirmations += r.c; });
  return { ...s, total: s.pending + s.confirmed + s.resolved, active: s.pending + s.confirmed };
};

// Автоматически удаляем завершённые точки («Завершено» / resolved) через 90 секунд (1.5 минуты)
export const startResolvedCleanup = (io, ttlMs = 90 * 1000, intervalMs = 15 * 1000) => {
  const run = async () => {
    if (!dbReady()) return;
    try {
      const cutoff = new Date(Date.now() - ttlMs);
      const expired = await Outage.find({
        status: 'resolved',
        $or: [
          { resolvedAt: { $lte: cutoff } },
          { resolvedAt: null, updatedAt: { $lte: cutoff } },
        ],
      }).select('_id');
      if (!expired.length) return;
      const ids = expired.map((d) => d._id);
      await Outage.deleteMany({ _id: { $in: ids }, status: 'resolved' });
      await Confirmation.deleteMany({ outage: { $in: ids } });
      if (io) {
        ids.forEach((id) => io.emit('outage:deleted', { id, _id: id }));
      }
      console.log(`[cleanup] Auto-deleted ${ids.length} resolved outage(s)`);
    } catch (e) {
      console.warn('[cleanup] error:', e.message);
    }
  };
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
};
