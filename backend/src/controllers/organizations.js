import { Parser } from 'json2csv';
import { Outage } from '../models/index.js';
import { wrap } from '../utils/helpers.js';
import { buildFilter, summary } from '../services/outages.js';
export const dashboard = wrap(async (req, res) => res.json(await summary(req.types)));
export const list = wrap(async (req, res) => res.json(await Outage.find(buildFilter(req.query, req.types)).sort('-createdAt').limit(1000)));
export const exportCsv = wrap(async (req, res) => {
  const rows = (await Outage.find(buildFilter(req.query, req.types)).sort('-createdAt')).map(o => ({
    ID: o._id, Type: o.type, Description: o.description, Status: o.status, Confirmations: o.confirmations,
    Latitude: o.lat, Longitude: o.lng, CreatedAt: o.createdAt.toISOString(),
  }));
  const csv = new Parser({ fields: ['ID', 'Type', 'Description', 'Status', 'Confirmations', 'Latitude', 'Longitude', 'CreatedAt'] }).parse(rows);
  res.header('Content-Type', 'text/csv; charset=utf-8').attachment('outages.csv').send('\ufeff' + csv);
});
