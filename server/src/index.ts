import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify({
	logger: true
});

await app.register(cors, {
  origin: "http://localhost:5173",
});

app.get("/", async () => {
	return {
		message: "Hello from API"
	};
});

app.get("/api/health", async () => {
	return {
		status: "ok",
	};
});

try {
	await app.listen({
		port: 3000,
		host: "0.0.0.0",
	});
	const response = await fetch("http://localhost:3000/api/health");
	const data = await response.json();

console.log(data);
  
} catch (error) {
	app.log.error(error);
	process.exit(1);
}

