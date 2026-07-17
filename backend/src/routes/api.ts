import { Router } from 'express';
import { getDomains, getPosts, createPost } from '../controllers/postController';

const router = Router();

// Domain routes
router.get('/domains', getDomains);

// Post routes
router.get('/posts', getPosts);
router.post('/posts', createPost);

export default router;
