# CarVault

A vehicle maintenance tracker made with the MERN stack for the Web Programming course (Fall 2026).

You add your cars, CarVault gives each one a maintenance schedule (oil, brakes, tyres and so on), and it works out when every item is next due from both time and kilometres. Your current odometer is estimated from your average km per month, so you don't have to update it all the time. When something is close or overdue you get an email.

## Features

- Register and login with JWT
- Garage with search, filter, sort and pagination
- Powertrain per car (petrol, hybrid, plug-in hybrid, electric) decides which items it gets, an electric car has no engine oil but gets a high voltage battery check
- Maintenance catalogue (the 18 items of srs appendix A plus a high voltage battery check) copied into every new vehicle, intervals can be changed or turned off per vehicle
- Due date engine: whichever of the time or km interval comes first wins
- Status for every item: overdue, due soon, up to date or needs data (shown as text and colour)
- Service history with receipts, logging a service resets that item and updates the avg km per month
- Dashboard with everything that needs attention across all vehicles
- Daily email reminders at 30, 7 and 1 day before an item is due and when it is overdue, one email per user and never the same reminder twice
- Analytics: total cost, cost per km, cost by category and cost per month (chart)
- Profile: change name, password, reminder setting, or delete the account with all its data

## Tech stack

| Part | Used |
| --- | --- |
| Frontend | React 19 with Vite, React Router, Redux Toolkit, Axios, Tailwind CSS, Recharts |
| Backend | Node, Express 5, Mongoose |
| Database | MongoDB Atlas |
| Auth | bcryptjs, jsonwebtoken |
| Uploads | multer, Cloudinary |
| Reminders | node-cron, nodemailer |
| Security | helmet, express-rate-limit, CORS limited to the client url |

Validation is written by hand on both sides, no Joi or zod.

## Folder layout

```
backend/
  config/       db and cloudinary
  controllers/  route logic
  jobs/         daily reminder job
  middleware/   auth, errors, uploads, rate limit
  models/       mongoose schemas
  routes/       express routers
  seed/         catalogue seed
  utils/        projection, due date, status, mailer
  server.js
frontend/
  src/
    components/ shared ui
    pages/      one file per page
    store/      redux store and auth slice
    api.js      axios instance with the token
```

## Running it locally

You need Node 20 or newer and a MongoDB database (Atlas free tier works).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | What it is |
| --- | --- |
| `PORT` | port for the api, default 5000 |
| `CLIENT_URL` | frontend url allowed by CORS, more than one can be split with commas |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | any long random string |
| `JWT_EXPIRES_IN` | token lifetime, default `1d` |
| `CLOUDINARY_*` | for vehicle photos and receipts, without them records still save but uploads are skipped with a warning |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | for reminder emails, for gmail use `smtp.gmail.com`, `587` and an app password |
| `MAIL_FROM` | sender shown on the emails, optional |
| `CRON_TZ` | time zone of the daily job, default `Asia/Karachi` |

If SMTP is empty the reminder emails are only printed in the console.

Then seed the catalogue (safe to run more than once) and start the server:

```bash
npm run seed
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
```

Make `frontend/.env` with the api url:

```
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

The app opens on http://localhost:5173.

### Useful scripts

| Where | Command | Does |
| --- | --- | --- |
| backend | `npm run dev` | api with nodemon |
| backend | `npm start` | api without nodemon |
| backend | `npm run seed` | adds or updates the catalogue items, run it again after pulling new items |
| backend | `npm run reminders` | runs the reminder sweep once right now |
| frontend | `npm run dev` | vite dev server |
| frontend | `npm run build` | production build into `dist` |
| frontend | `npm run lint` | oxlint |

## API

All routes start with `/api`. Everything except register and login needs an `Authorization: Bearer <token>` header. Errors always come back as `{ message, errors }`.

| Method | Route | Does |
| --- | --- | --- |
| POST | `/auth/register` | make an account |
| POST | `/auth/login` | login, returns a token |
| GET | `/auth/me` | current user |
| PUT | `/users/me` | change name, default km or reminders |
| PUT | `/users/me/password` | change password |
| DELETE | `/users/me` | delete account and all its data |
| GET | `/vehicles` | list with `search`, `status`, `sort`, `page`, `limit` |
| POST | `/vehicles` | add a vehicle (multipart, optional `photo`, `powertrain` petrol, hybrid, phev or electric) |
| GET | `/vehicles/:id` | one vehicle |
| GET | `/vehicles/:id/schedule` | its items with due dates and status |
| PUT | `/vehicles/:id` | edit |
| DELETE | `/vehicles/:id` | delete with its schedule, services and reminders |
| PUT | `/schedule/:entryId` | change intervals or turn an item off |
| GET | `/catalogue` | the default items with the powertrains each one fits |
| GET | `/services` | history with filters and pagination |
| POST | `/services` | log a service (multipart, optional `receipt`) |
| PUT | `/services/:id` | edit a service |
| DELETE | `/services/:id` | delete a service |
| GET | `/dashboard` | totals and urgent items |
| GET | `/analytics` | cost numbers, optional `?vehicle=id` |

Status codes used: 401 not logged in, 404 not found (also for other users' data), 409 duplicate, 422 validation, 429 too many login attempts.

## Security

- Passwords hashed with bcrypt
- Every query is filtered by the logged in user, other users' data gives 404
- helmet headers on every response
- login and register limited to 20 tries per 15 minutes per ip
- CORS only allows `CLIENT_URL`
- React escapes all text, nothing is rendered as raw html

## Deployment

- Backend on Render using `render.yaml`, set the secret env vars in the Render dashboard and run `npm run seed` once from the Render shell
- Frontend on Vercel with `frontend` as the root folder and `VITE_API_URL` pointing at the Render url, `frontend/vercel.json` sends every path to `index.html` so refreshing a page works
- Put the Vercel url in `CLIENT_URL` on Render

On the free Render plan the server sleeps when nobody uses it, so the 8am reminder job only runs if the server is awake at that time.

## Known limits

- Editing a service record is in the api but not in the ui
- Cloudinary uploads need real keys to work
