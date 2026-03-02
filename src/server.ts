import express from "express";
import path from "path";

const app = express();
const PORT: number = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log(path.join(path.resolve(), "../public"));
app.use(express.static(path.join(path.resolve(), "../public")));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get("/", (req, res) => {
  res.send(`<h1>Express is listening on port ${String(PORT)}</h1> <p>${typeof req.body}</p>`);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${String(PORT)}`);
});
