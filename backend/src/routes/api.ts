import { Router } from 'express';
import { getDomains, getPosts, createPost, getPost } from '../controllers/postController';

const router = Router();

// Domain routes
router.get('/domains', getDomains);

// Post routes
router.get('/posts', getPosts);
router.get('/posts/:id', getPost);
router.post('/posts', createPost);

export default router;
