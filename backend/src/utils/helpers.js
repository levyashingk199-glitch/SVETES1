export class AppError extends Error { constructor(m, s = 400) { super(m); this.status = s; } }
export const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const TYPES = ['electricity', 'water', 'gas'];
export const STATUSES = ['pending', 'confirmed', 'resolved', 'planned', 'in_progress', 'active'];
export const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
