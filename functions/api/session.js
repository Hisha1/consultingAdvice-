import { json } from "../../lib/session.js";

// The middleware has already checked the cookie; reaching here means it's valid.
export const onRequestGet = () => json(null, 204);
