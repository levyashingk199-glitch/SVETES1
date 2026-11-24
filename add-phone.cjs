// Запуск из КОРНЯ проекта (warntech-fullstack): node add-phone.cjs
// Добавляет обязательный проверяемый номер телефона при создании точки обычным пользователем.
const fs = require('fs');

function patch(file, pairs) {
  if (!fs.existsSync(file)) { console.error('НЕТ ФАЙЛА: ' + file); return false; }
  let src = fs.readFileSync(file, 'utf8');
  const crlf = src.includes('\r\n');
  src = src.replace(/\r\n/g, '\n');
  let changed = false, ok = true;
  for (const [oldS, newS, marker] of pairs) {
    if (marker && src.includes(marker)) continue;           // уже применено
    if (!src.includes(oldS)) { console.error('  НЕ НАЙДЕН блок в ' + file + ':\n  ' + oldS.split('\n')[0]); ok = false; continue; }
    src = src.replace(oldS, newS); changed = true;
  }
  if (!ok) { console.error('Файл НЕ изменён: ' + file); return false; }
  if (changed) {
    if (crlf) src = src.replace(/\n/g, '\r\n');
    fs.writeFileSync(file, src, 'utf8');
    console.log('ГОТОВО: ' + file);
  } else console.log('Уже применено: ' + file);
  return true;
}

let allOk = true;

// 1. Модель: поле phone + скрыть его из публичного JSON (и из сокетов)
allOk &= patch('backend/src/models/index.js', [
  ['delete r.password; return r;', 'delete r.password; delete r.phone; return r;', 'delete r.phone'],
  ["  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },\n}, { timestamps: true, ...J });",
   "  phone: { type: String, default: '' },\n  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },\n}, { timestamps: true, ...J });",
   "phone: { type: String"],
]);

// 2. Контроллер: проверка номера + телефон видят только админ/организация
allOk &= patch('backend/src/controllers/outages.js', [
  ["const emit = (req, ev, o) => req.app.get('io').emit(ev, o.toJSON ? o.toJSON() : o);",
   `const emit = (req, ev, o) => req.app.get('io').emit(ev, o.toJSON ? o.toJSON() : o);

// Узбекистан: +998 XX XXX XX XX (мобильные коды операторов и ташкентский 71)
const UZ_CODES = ['20', '33', '50', '55', '71', '77', '88', '90', '91', '93', '94', '95', '97', '98', '99'];
const normalizePhone = (v) => {
  const d = String(v || '').replace(/\\D/g, '');
  const n = d.length === 9 ? '998' + d : d;
  if (!/^998\\d{9}$/.test(n)) return null;
  if (!UZ_CODES.includes(n.slice(3, 5))) return null;
  return '+' + n;
};`, 'const normalizePhone'],
  ["  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new AppError('Неверные координаты');",
   `  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new AppError('Неверные координаты');
  const isStaff = ['admin', 'organization'].includes(req.user?.role);
  let phone = normalizePhone(req.body.phone);
  if (!phone && !isStaff) throw new AppError('Укажите корректный номер телефона: +998 XX XXX XX XX');
  phone = phone || '';`, 'const isStaff = ['],
  ["    createdBy: req.user?._id || null,\n  });", "    phone,\n    createdBy: req.user?._id || null,\n  });", '    phone,\n    createdBy'],
  ["export const list = wrap(async (req, res) => res.json(await Outage.find(buildFilter(req.query)).sort('-createdAt').limit(500)));",
   `export const list = wrap(async (req, res) => {
  const docs = await Outage.find(buildFilter(req.query)).sort('-createdAt').limit(500);
  const staff = ['admin', 'organization'].includes(req.user?.role);
  res.json(staff ? docs.map((d) => ({ ...d.toJSON(), phone: d.phone || '' })) : docs);
});`, 'const staff = ['],
]);

// 3. Роуты: список с optionalAuth, чтобы админ видел телефоны
allOk &= patch('backend/src/routes/index.js', [
  ["r.get('/outages', O.list);", "r.get('/outages', optionalAuth, O.list);", "r.get('/outages', optionalAuth, O.list);"],
]);

// 4. Фронтенд: телефон уходит на сервер
allOk &= patch('frontend/src/api/index.js', [
  ["      affectedResidents: outageData.affectedResidents || 100,\n",
   "      affectedResidents: outageData.affectedResidents || 100,\n      phone: outageData.phone || '',\n", "phone: outageData.phone"],
]);

// 5. Фронтенд: ошибки 4xx (в т.ч. неверный телефон) не сохраняем локально
allOk &= patch('frontend/src/App.jsx', [
  ["if (err.status === 429 || err.message?.includes('Слишком часто')) {", "if (err.status >= 400 && err.status < 500) {", 'err.status >= 400 && err.status < 500'],
]);

console.log(allOk ? '\nВСЁ ПРИМЕНЕНО. Перезапусти проект (npm run dev).' : '\nЕСТЬ ОШИБКИ: см. сообщения выше.');
process.exit(allOk ? 0 : 1);
