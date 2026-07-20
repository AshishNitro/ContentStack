"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const postController_1 = require("../controllers/postController");
const router = (0, express_1.Router)();
// Domain routes
router.get('/domains', postController_1.getDomains);
// Post routes
router.get('/posts', postController_1.getPosts);
router.get('/posts/:id', postController_1.getPost);
router.post('/posts', postController_1.createPost);
exports.default = router;
