// Запуск из КОРНЯ проекта (warntech-fullstack): node admin-phone.cjs
// Показывает телефон в админ-панели: в таблице точек (с кнопкой «позвонить») и в CSV-выгрузке.
const fs = require('fs');

function patch(file, pairs) {
  if (!fs.existsSync(file)) { console.error('НЕТ ФАЙЛА: ' + file); return false; }
  let src = fs.readFileSync(file, 'utf8');
  const crlf = src.includes('\r\n');
  src = src.replace(/\r\n/g, '\n');
  let changed = false, ok = true;
  for (const [oldS, newS, marker] of pairs) {
    if (marker && src.includes(marker)) continue;
    if (!src.includes(oldS)) { console.error('  НЕ НАЙДЕН блок в ' + file + ': ' + oldS.split('\n')[0].trim()); ok = false; continue; }
    src = src.replace(oldS, newS); changed = true;
  }
  if (!ok) { console.error('Файл НЕ изменён: ' + file); return false; }
  if (changed) { if (crlf) src = src.replace(/\n/g, '\r\n'); fs.writeFileSync(file, src, 'utf8'); console.log('ГОТОВО: ' + file); }
  else console.log('Уже применено: ' + file);
  return true;
}

let allOk = true;

// 1. api: телефон проходит через normalizeOutage (без затирания пустым значением при PATCH)
allOk &= patch('frontend/src/api/index.js', [
  ["    impactRadius: raw.impactRadius || raw.radius || 250,\n",
   "    impactRadius: raw.impactRadius || raw.radius || 250,\n    ...(raw.phone ? { phone: raw.phone } : {}),\n", '...(raw.phone ?'],
  ["      body: JSON.stringify(payload),\n    });\n    return normalizeOutage(res.outage || res.data || res);",
   "      body: JSON.stringify(payload),\n    });\n    // сервер не возвращает телефон в ответе — оставляем введённый, чтобы он был виден сразу\n    return { ...normalizeOutage(res.outage || res.data || res), phone: outageData.phone || '' };",
   'сервер не возвращает телефон'],
]);

// 2. Админ-панель: колонка/строка с телефоном + CSV
allOk &= patch('frontend/src/components/Admin/AdminPanelModal.jsx', [
  ["  Copy,\n} from 'lucide-react';", "  Copy,\n  Phone,\n} from 'lucide-react';", '  Phone,\n'],
  ["{pt.coordinates && (",
   `{pt.phone && (
                                    <a
                                      className="coords-btn"
                                      href={\`tel:\${pt.phone}\`}
                                      title="Позвонить заявителю"
                                    >
                                      <Phone size={11} />
                                      <span>{pt.phone}</span>
                                    </a>
                                  )}
                                  {pt.coordinates && (`, 'title="Позвонить заявителю"'],
  ["Завершение,Откликов\\n", "Завершение,Откликов,Телефон\\n", 'Откликов,Телефон'],
  ['"${i.reportsCount || 0}"', '"${i.reportsCount || 0}","${i.phone || \'\'}"', "${i.phone || ''}"],
]);

console.log(allOk ? '\nВСЁ ПРИМЕНЕНО. Vite перезагрузится сам.' : '\nЕСТЬ ОШИБКИ: см. сообщения выше.');
process.exit(allOk ? 0 : 1);
