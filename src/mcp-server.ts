import * as http from "http"

async function startServer() {
	const server = http.createServer(async (req, res) => {
		// Set response headers
		res.writeHead(200, {"Content-Type": "application/json"})

		// Example: Fetch queue data from your NestJS API
		if (req.url === "/queue") {
			try {
				const response = await fetch("http://localhost:5000/")
				const data = await response.json()
				res.end(JSON.stringify(data))
			} catch (error) {
				res.end(JSON.stringify({status: "error", message: "API unreachable"}))
			}
		} else {
			// Default response
			res.end(JSON.stringify({status: "ok"}))
		}
	})

	server.listen(5002, () => {})
}

startServer()
