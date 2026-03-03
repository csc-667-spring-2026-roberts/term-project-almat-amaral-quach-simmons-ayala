import { Router } from "express";

const router = Router();

router.get("/", (_request, response) => {
  response.send(`<h1>Hello world!</h1><p>${new Date().toLocaleDateString()}</p>`);
});

router.get("/:id", (request, response) => {
  response.send(`Hi at ${request.params.id}`);
});

export default router;
