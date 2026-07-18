"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPost = exports.getPosts = exports.getDomains = void 0;
const database_1 = __importDefault(require("../database"));
const getDomains = async (req, res) => {
    try {
        const domainsResult = await database_1.default.query('SELECT * FROM domains ORDER BY id');
        const regionsResult = await database_1.default.query('SELECT * FROM regions ORDER BY id');
        const domainsWithRegions = domainsResult.rows.map(domain => ({
            ...domain,
            regions: regionsResult.rows.filter(r => r.domain_id === domain.id)
        }));
        res.json(domainsWithRegions);
    }
    catch (error) {
        console.error('Failed to fetch domains', error);
        res.status(500).json({ error: 'Failed to fetch domains' });
    }
};
exports.getDomains = getDomains;
const getPosts = async (req, res) => {
    try {
        const domainId = req.query.domainId ? Number(req.query.domainId) : null;
        let query = 'SELECT * FROM posts';
        const values = [];
        if (domainId) {
            query += ' WHERE domain_id = $1';
            values.push(domainId);
        }
        query += ' ORDER BY created_at DESC';
        const result = await database_1.default.query(query, values);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch posts', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
};
exports.getPosts = getPosts;
const createPost = async (req, res) => {
    try {
        const { domainId, regionId, title, content } = req.body;
        if (!domainId || !title || !content) {
            return res.status(400).json({ error: 'domainId, title, and content are required fields.' });
        }
        const query = `
      INSERT INTO posts (domain_id, region_id, title, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
        const values = [domainId, regionId || null, title, content];
        const result = await database_1.default.query(query, values);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Failed to create post', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
};
exports.createPost = createPost;
