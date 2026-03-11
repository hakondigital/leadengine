// Re-export the POST handler from the parent route so that
// both /api/quotes/[id] (POST) and /api/quotes/[id]/send (POST)
// trigger the send-quote logic.
export { POST } from '../route';
