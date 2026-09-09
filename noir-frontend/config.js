// Use the local API during development and the deployed API in production.
window.NOIR_API_BASE =
	window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
		? "http://127.0.0.1:4000/api"
		: "https://noir-kenya.onrender.com/api";