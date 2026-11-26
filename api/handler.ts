// Single Vercel Function for the whole API; vercel.json rewrites /api/* here.
import { handle } from '../server/app.js';

export default handle;
