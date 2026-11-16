# EasyBook


[![hexlet-check](https://github.com/Asela24/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Asela24/ai-for-developers-project-386/actions)

Разработайте совместно с ИИ сервис для бронирования звонков

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Стек

- Typescript, vite. shadcn/ui, react, tanstack router
- Testing: vitest
- Docker
- Nodejs for backend
- SDK is @hey-api/openapi-ts
-  TypeSpec → OpenAPI
  ├─ фронт: openapi-typescript + openapi-fetch (или hey-api / orval)
  └─ бек:   Fastify + fastify-openapi-glue + openapi-typescript для типов
            + Schemathesis в CI


## Установка

```bash
git clone https://github.com/Asela24/ai-for-developers-project-386.git
cd ai-for-developers-project-386
mise install
pnpm install
```

## Использование

```bash
mise run dev
```

Приложение: http://localhost:5173. API проксируется под `/api`.

## Docker

Один образ из корневого `Dockerfile`: сервер отдаёт собранный фронтенд и API под `/api` на порту из переменной `PORT`.

```bash
docker build -t easybook .
docker run --rm -e PORT=8080 -p 8080:8080 easybook
```

Приложение: http://localhost:8080.

## Данные

Данные хранятся в памяти сервера и **сбрасываются при каждом перезапуске**: брони пропадают, типы событий возвращаются к стандартным. На бесплатном тарифе Render инстанс засыпает после простоя, и пробуждение — это тоже перезапуск.

## Деплой

Приложение развёрнуто на [Render](https://render.com) как Web Service (Docker, бесплатный тариф) из ветки `main`, каждый коммит в `main` деплоится автоматически. `PORT` Render задаёт сам.

## MCP

В `.mcp.json` лежит проектная конфигурация MCP для Claude Code: [Render MCP](https://render.com/docs/mcp-server) для управления деплоем, логов и статуса сервиса. Ключа в файле нет, он берётся из переменной окружения.

1. Создайте API key в Render: **Account Settings → API Keys → Create API Key**.
2. Добавьте его в окружение, например в `~/.zshrc`, не в репозиторий:
   ```bash
   export RENDER_API_KEY=rnd_...
   ```
3. Запустите Claude Code в корне репозитория и разрешите проектный сервер `render`. `/mcp` покажет его статус.
4. Выберите workspace: «Set my Render workspace to <имя>».

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
