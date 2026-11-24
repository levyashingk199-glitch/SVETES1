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
