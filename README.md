# WarnTech — Full-stack проект

Проект объединяет интерфейс WarnTech (React + Vite) и совместимый с ним API (Node.js + Express + MongoDB).

## Структура

```text
warntech-fullstack/
├── frontend/   React + Vite + Leaflet
├── backend/    Express + MongoDB + Socket.IO
├── package.json
└── README.md
```

## Требования

- Node.js 20 или новее
- npm
- Интернет при первом запуске встроенной MongoDB либо собственная MongoDB Atlas URI

## Первый запуск

В корне проекта:

```bash
npm install
npm run install:all
```

Создай файл `backend/.env` на основе `backend/.env.example` и задай `JWT_SECRET`.
Для локального запуска `MONGO_URI` можно оставить пустым: backend попробует использовать встроенную MongoDB и сохранит данные в `backend/data/db`.

Запусти оба сервера одной командой:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Проверка API: http://localhost:4000/api/outages

Vite автоматически перенаправляет запросы `/api` на backend во время разработки.

## Production

Собери интерфейс:

```bash
npm run build
```

Для отдельного хостинга frontend (например, Vercel) добавь переменную окружения:

```text
VITE_API_URL=https://АДРЕС-ТВОЕГО-BACKEND/api
```

На backend задай `CLIENT_URL` равным адресу frontend, `MONGO_URI` — строку подключения к MongoDB, а `JWT_SECRET` — длинный случайный секрет. Не загружай `.env` в GitHub.

## Важно о составе

Для единого проекта выбраны две папки, API которых соответствуют друг другу:
- `Warntech.zip` — React-интерфейс, который обращается к `/api/outages`.
- `backend (2).zip` — сервер с маршрутами `/api/outages`.

`node-backend (2).zip` использует другой API (`/api/incidents`) и другую модель авторизации, а `frontend-developer-2-only-task.zip` — отдельный набор Vanilla JS-компонентов для другого приложения. Их нельзя просто скопировать поверх выбранных частей: контракты несовместимы. Их исходники не смешивались, чтобы не сломать проект.

## Безопасность

- Файл `backend/.env` с секретами не включён.
- Используй `.env.example` как шаблон и храни реальные ключи только локально или в переменных окружения хостинга.

## Развертывание на Render (render.com)

Поддерживаются 2 варианта деплоя:

### Вариант 1: Через Blueprint (рекомендуется)
1. Загрузите репозиторий на GitHub.
2. В личном кабинете [Render Dashboard](https://dashboard.render.com/) нажмите **New +** → **Blueprint**.
3. Выберите свой репозиторий — Render автоматически прочитает файл `render.yaml` и создаст два сервиса:
   - **warntech-api** (Web Service, Node.js)
   - **warntech-frontend** (Static Site, React)
4. В переменных окружения укажите:
   - `MONGO_URI` для бэкенда (строка подключения из бесплатного кластера MongoDB Atlas).
   - `CLIENT_URL` для бэкенда: `https://warntech-frontend.onrender.com` (адрес фронтенда).
   - `VITE_API_URL` для фронтенда: `https://warntech-api.onrender.com/api` (адрес бэкенда).

### Вариант 2: Единым сервисом (All-in-One, 1 бесплатный сервис)
1. В Render нажмите **New +** → **Web Service**.
2. Укажите репозиторий.
3. Настройки сервиса:
   - **Root Directory**: (оставьте пустым)
   - **Build Command**: `npm run build:all`
   - **Start Command**: `npm start`
4. Переменные окружения (Environment Variables):
   - `NODE_ENV`: `production`
   - `MONGO_URI`: строка подключения из MongoDB Atlas
   - `JWT_SECRET`: любой секретный ключ (или нажмите Generate)
5. Сервер автоматически раздаст и REST API (`/api`), и собранный веб-интерфейс без проблем с CORS.

## Всегда онлайн (24/7)

Что сделано в коде:
- **Backend не падает при сбое БД**: порт открывается сразу, MongoDB подключается в фоне с повторными попытками; пока БД недоступна, API отвечает `503` вместо зависания. `/api/health` всегда отвечает `200` и показывает состояние БД.
- **Защита от падений**: обработчики `unhandledRejection` / `uncaughtException`, graceful shutdown, `trust proxy` для rate-limit за прокси.
- **Frontend**: таймаут и автоповторы запросов (учитывают «просыпание» сервера), прогрев API при открытии страницы и пинг каждые 5 минут, пока вкладка открыта.
- **Самопинг backend** (`KEEP_ALIVE_URL` / `RENDER_EXTERNAL_URL`) и внешний пинг через GitHub Actions (`.github/workflows/keep-alive.yml`).

Что нужно настроить:
1. **MongoDB Atlas** (бесплатный кластер) → `MONGO_URI` на backend. Встроенная MongoDB на хостинге не сохраняет данные.
2. **Render**: `render.yaml` уже содержит `healthCheckPath`. Укажите `MONGO_URI`, `CLIENT_URL`, `VITE_API_URL`.
3. **GitHub** → Settings → Secrets and variables → Actions → Variables: `API_URL=https://ВАШ-BACKEND.onrender.com`.
4. Дополнительно: бесплатный монитор UptimeRobot на `https://ВАШ-BACKEND.onrender.com/api/health` с интервалом 5 минут.

Свой сервер/VPS:
- `docker compose up -d --build` (контейнеры с `restart: unless-stopped`, MongoDB в комплекте; нужен `JWT_SECRET` в `.env`);
- или PM2: `npm i -g pm2 && npm run pm2:start && pm2 startup`.

Важно: на бесплатном тарифе Render сервис всё равно может иногда засыпать, если пинги не прошли. Гарантированный 24/7 даёт платный тариф или собственный VPS.
