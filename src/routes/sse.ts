import { Router } from "express";
import SSE from "../sse.js";

const router = Router();

router.get("/", (request, response) => {
  const user = request.session.user;
  const userId = user?.id;

  const clientId = SSE.addClient(response, userId);

  request.on("close", () => {
    SSE.removeClient(clientId);
  });
});

export default router;
