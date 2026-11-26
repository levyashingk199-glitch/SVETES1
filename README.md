# WarnTech — Full-stack проект

WarnTech объединяет интерфейс React + Vite и API на Node.js + Express + MongoDB + Socket.IO. Приложение предназначено для отображения и отправки сообщений об отключениях электричества, воды и газа в Ташкенте.

## Структура

- `frontend/` — React, Vite, Leaflet.
- `backend/` — Express, MongoDB, Socket.IO.
- `docker-compose.yml` — запуск всех сервисов через Docker.
- `render.yaml` — конфигурация одного web-сервиса на Render.

## Требования

- Node.js 20 или новее.
- npm.
- Интернет при первом запуске встроенной MongoDB, если `MONGO_URI` не задан.
- Для production — MongoDB Atlas или другой постоянный MongoDB-сервер.

## Локальный запуск

В корне проекта установи зависимости:

```bash
npm install
npm run install:all
```

Создай `backend/.env` на основе `backend/.env.example`. Обязательно задай собственные значения `JWT_SECRET` и `ADMIN_PASSWORD`. Для локальной разработки `MONGO_URI` можно оставить пустым: backend запустит встроенную MongoDB в `backend/data/db`.

Запусти frontend и backend:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Проверка API: http://localhost:4000/api/health

Vite перенаправляет запросы `/api` на локальный backend.

## Авторизация

При первом подключении к базе backend создаёт администратора, только если заданы `ADMIN_EMAIL` и `ADMIN_PASSWORD` и в базе ещё нет пользователя с ролью `admin`. Не используй демонстрационный пароль в публичном развёртывании. Обычная регистрация создаёт аккаунт жителя; роль администратора нельзя получить через форму регистрации.

## Production на Render

`render.yaml` настраивает один web-сервис: frontend собирается в `frontend/dist`, а backend раздаёт собранный интерфейс и API с одного домена.

В Render задай переменные:

- `MONGO_URI` — постоянная база MongoDB Atlas. Не полагайся на встроенную MongoDB для production: файловая система бесплатного хостинга может быть временной.
- `JWT_SECRET` — длинный случайный секрет.
- `ADMIN_EMAIL` и `ADMIN_PASSWORD` — учётные данные первоначального администратора.

`RENDER_EXTERNAL_URL` Render предоставляет автоматически и используется для самопинга. Бесплатный тариф Render может засыпать; самопинг не гарантирует непрерывную доступность. Для более стабильной работы используй внешний мониторинг или платный тариф.

## Docker / собственный сервер

Скопируй корневой `.env.example` в `.env` рядом с `docker-compose.yml`, укажи собственные `JWT_SECRET` и `ADMIN_PASSWORD`, затем запусти:

```bash
docker compose up -d --build
```

Для PM2:

```bash
npm install
npm run install:all
npm install -g pm2
npm run pm2:start
pm2 startup
```

## Отдельный frontend на Vercel

Если frontend развёрнут отдельно, задай в настройках Vercel переменную `VITE_API_URL` со значением `https://АДРЕС-ТВОЕГО-BACKEND/api`. На backend укажи `CLIENT_URL` с доменом frontend. Не загружай `.env` и реальные секреты в GitHub.

## Данные и безопасность

- Локальные базы `data/db` и `backend/data/db` не должны попадать в Git.
- Не публикуй `backend/.env`, MongoDB URI, JWT secret или пароль администратора.
- В автономном режиме интерфейс может показать ранее загруженный кэш, но создание, изменение и удаление заявок требуют ответа backend.
