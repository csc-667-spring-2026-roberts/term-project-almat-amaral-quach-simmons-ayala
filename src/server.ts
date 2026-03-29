import express from "express";
import session from "express-session";
import path from "path";

import homeRoutes from "./routes/home.js";
import testRoutes from "./routes/test.js";

import connectPgSimple from "connect-pg-simple";
import db from "./db/connections.js";
import { configDotenv } from "dotenv";

configDotenv();

const app = express();
const PORT: number = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({ pgPromise: db }),
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

console.log(path.join(path.resolve(), "../public"));
app.use(express.static(path.join(path.resolve(), "../public")));

app.use((request, _response, next) => {
  console.log(`${new Date().toISOString()} ${request.method} ${request.path}`);
  next();
});

app.use("/", homeRoutes);
app.use("/test", testRoutes);

app.get("/", (req, res) => {
  res.send(`<h1>Express is listening on port ${String(PORT)}</h1> <p>${typeof req.body}</p>`);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${String(PORT)}`);
});
