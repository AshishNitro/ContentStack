import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Root endpoint for testing
app.get('/', (req, res) => {
  res.send('Multi-Domain Blog API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
