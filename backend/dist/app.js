"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const api_1 = __importDefault(require("./routes/api"));
const database_1 = __importStar(require("./database"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
function normalizeOrigin(origin) {
    try {
        return new URL(origin).origin;
    }
    catch {
        return origin.replace(/\/$/, '');
    }
}
async function isAllowedOrigin(origin) {
    if (!origin)
        return true;
    const normalizedOrigin = normalizeOrigin(origin);
    const staticOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_PRIMARY_ORIGIN,
        process.env.FRONTEND_PRIMARY_HOST ? `https://${process.env.FRONTEND_PRIMARY_HOST}` : null,
    ].filter(Boolean);
    if (staticOrigins.includes(normalizedOrigin))
        return true;
    const host = new URL(normalizedOrigin).host.replace(/^www\./, '');
    const result = await database_1.default.query("SELECT id FROM domains WHERE LOWER(host) = LOWER($1) AND status = 'active' LIMIT 1", [host]);
    return result.rows.length > 0;
}
// Middleware
app.use((0, cors_1.default)({
    origin: async (origin, callback) => {
        try {
            callback(null, await isAllowedOrigin(origin));
        }
        catch (error) {
            callback(error);
        }
    },
}));
app.use(express_1.default.json());
// Routes
app.use('/api', api_1.default);
// Root endpoint for testing
app.get('/', (req, res) => {
    res.send('Multi-Domain Blog API is running');
});
(0, database_1.ensureDomainSchema)()
    .then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
})
    .catch((error) => {
    console.error('Failed to prepare database schema', error);
    process.exit(1);
});
