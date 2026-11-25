// Запуск из папки frontend: node patch-admin.cjs
// Делает вход админа в панели НАСТОЯЩИМ (api.login -> токен), чтобы сервер видел админа.
const fs = require('fs');
const file = process.argv[2] || 'src/components/Admin/AdminPanelModal.jsx';
let src = fs.readFileSync(file, 'utf8');
const crlf = src.includes('\r\n');
src = src.replace(/\r\n/g, '\n');

const old1 = `  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassInput === 'admin123' || adminPassInput === 'admin' || adminPassInput === '') {
      onLoginAsAdmin({
        email: 'admin@netsveta.dev',
        role: 'admin',
        name: 'Главный Администратор Ташкента',
      });
      setAuthError('');
      showNotice('Успешный вход в режим администратора!');
    } else {
      setAuthError('Неверный пароль администратора (по умолчанию: admin123)');
    }
  };`;

const new1 = `  const loginAsRealAdmin = async (password) => {
    try {
      const { token, user: u } = await api.login('admin@netsveta.dev', password);
      if (!token || !u) throw new Error('Не удалось войти: сервер не вернул токен');
      onLoginAsAdmin(u);
      setAuthError('');
      showNotice('Успешный вход в режим администратора!');
    } catch (err) {
      setAuthError(err.message || 'Неверный пароль администратора');
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    loginAsRealAdmin(adminPassInput);
  };`;

const old2 = `                    onClick={() => {
                      onLoginAsAdmin({
                        email: 'admin@netsveta.dev',
                        role: 'admin',
                        name: 'Главный Администратор',
                      });
                      showNotice('Вход как Главный Администратор выполнен успешно!');
                    }}`;

const new2 = `                    onClick={() => loginAsRealAdmin(adminPassInput || 'admin123')}`;

let ok = true;
if (src.includes(old1)) src = src.replace(old1, new1); else { console.error('НЕ НАЙДЕН блок handleAdminLogin'); ok = false; }
if (src.includes(old2)) src = src.replace(old2, new2); else { console.error('НЕ НАЙДЕН блок кнопки быстрого входа'); ok = false; }
if (!ok) { console.error('Файл НЕ изменён.'); process.exit(1); }

if (crlf) src = src.replace(/\n/g, '\r\n');
fs.writeFileSync(file, src, 'utf8');
console.log('ГОТОВО: ' + file);
