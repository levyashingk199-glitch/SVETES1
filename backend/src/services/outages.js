import { Outage } from '../models/index.js';
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
