import { createAppServer } from "./ui/server.js";

const HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;

function readPort(text) {
  if (text === undefined || text === "") {
    return DEFAULT_PORT;
  }

  const port = Number(text);
  return Number.isInteger(port) && port >= 1 && port <= 65_535 ? port : null;
}

const port = readPort(process.env.PORT);

if (port === null) {
  console.error(`PORT inválida: "${process.env.PORT}". Use um número de 1 a 65535, por exemplo PORT=3001 npm start.`);
  process.exit(1);
}

const server = createAppServer();

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `A porta ${port} já está em uso, provavelmente por outro npm start aberto. ` +
        `Feche o outro servidor (Ctrl+C) ou rode em outra porta: PORT=${port + 1} npm start`,
    );
  } else {
    console.error(`Não foi possível iniciar o servidor: ${error.message}`);
  }

  process.exit(1);
});

server.listen(port, HOST, () => {
  console.log(`Simulador de Livro de Ofertas em http://${HOST}:${port}`);
});
