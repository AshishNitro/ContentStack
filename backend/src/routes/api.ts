import { Router } from 'express';
import {
  getDomains,
  createDomain,
  updateDomain,
  deleteDomain,
  resolveDomainByHost,
  verifyDomain,
  getPosts,
  createPost,
  getPost,
} from '../controllers/postController';

const router = Router();

// Domain routes
router.get('/domains', getDomains);
router.post('/domains', createDomain);
router.get('/domains/resolve', resolveDomainByHost);
router.patch('/domains/:id', updateDomain);
router.delete('/domains/:id', deleteDomain);
router.post('/domains/:id/verify', verifyDomain);

// Post routes
router.get('/posts', getPosts);
router.get('/posts/:id', getPost);
router.post('/posts', createPost);

export default router;
