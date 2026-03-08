import express from "express";
import path from "path";

import homeRoutes from "./routes/home.js";
import testRoutes from "./routes/test.js";

const app = express();
const PORT: number = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
