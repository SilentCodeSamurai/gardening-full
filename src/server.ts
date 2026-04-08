import handler from "@tanstack/react-start/server-entry";
import { paraglideMiddleware } from "./app/paraglide/server.js";

export default {
	fetch(req: Request): Promise<Response> {
		return paraglideMiddleware(req, () => handler.fetch(req));
	},
};
