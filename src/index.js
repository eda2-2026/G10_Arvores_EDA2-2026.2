import { createAppServer } from "./ui/server.js";

const HOST = "127.0.0.1";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

createAppServer().listen(port, HOST, () => {
  console.log(`Simulador de Livro de Ofertas em http://${HOST}:${port}`);
});
