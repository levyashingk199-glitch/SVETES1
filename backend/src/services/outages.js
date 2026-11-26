
import { Outage, Confirmation } from '../models/index.js';
import { dbReady } from '../config/db.js';
import { TYPES, STATUSES, esc } from '../utils/helpers.js';

export const buildFilter = (q = {}, types = TYPES) => {
  const f = { type: { $in: types } };

  if (TYPES.includes(q.type) && types.includes(q.type)) f.type = q.type;
  if (STATUSES.includes(q.status)) f.status = q.status;

  if (q.q) {
    const r = { $regex: esc(q.q), $options: 'i' };
    f.$or = [{ description: r }, { address: r }];
  }

  return f;
};

export const summary = async (types) => {
  const rows = await Outage.aggregate([
    { $match: { type: { $in: types } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        confirmations: { $sum: '$confirmations' },
        affectedResidents: { $sum: '$affectedResidents' }
      }
    }
  ]);

  const counts = {
    pending: 0,
    active: 0,
    confirmed: 0,
    in_progress: 0,
    planned: 0,
    resolved: 0,
    confirmations: 0,
    affectedResidentsTotal: 0
  };

  rows.forEach((row) => {
    counts[row._id] = row.count;
    counts.confirmations += row.confirmations;
    if (row._id !== 'resolved') {
      counts.affectedResidentsTotal += row.affectedResidents;
    }
  });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const resolvedToday = await Outage.countDocuments({
    type: { $in: types },
    status: 'resolved',
    resolvedAt: { $gte: startOfDay }
  });

  const activeCount = counts.pending + counts.active;
  const inProgressCount = counts.confirmed + counts.in_progress;
  const total = activeCount + inProgressCount + counts.planned + counts.resolved;

  return {
    ...counts,
    activeCount,
    inProgressCount,
    resolvedToday,
    total,
    active: activeCount + inProgressCount
  };
};

// Автоматически удаляем завершённые точки через 90 секунд
export const startResolvedCleanup = (
  io,
  ttlMs = 90 * 1000,
  intervalMs = 15 * 1000
) => {
  const run = async () => {
    if (!dbReady()) return;

    try {
      const cutoff = new Date(Date.now() - ttlMs);

      const expired = await Outage.find({
        status: 'resolved',
        $or: [
          { resolvedAt: { $lte: cutoff } },
          { resolvedAt: null, updatedAt: { $lte: cutoff } }
        ]
      }).select('_id');

      if (!expired.length) return;

      const ids = expired.map(d => d._id);

      await Outage.deleteMany({
        _id: { $in: ids },
        status: 'resolved'
      });

      await Confirmation.deleteMany({
        outage: { $in: ids }
      });

      if (io) {
        ids.forEach(id => {
          io.emit('outage:deleted', { id, _id: id });
        });
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
