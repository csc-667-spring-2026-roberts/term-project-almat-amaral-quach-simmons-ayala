import express from "express";

const app = express();
const PORT: number = process.env.PORT ? Number(process.env.PORT) : 3000;

app.get("/", (_req, res) => {
  res.send(`<h1>Express is listening on port ${String(PORT)}</h1>`);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${String(PORT)}`);
});
