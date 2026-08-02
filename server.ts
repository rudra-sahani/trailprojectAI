import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import authRouter from './backend/routes/auth.js';
import usersRouter from './backend/routes/users.js';
import reviewsRouter from './backend/routes/reviews.js';
import feedbackRouter from './backend/routes/feedback.js';
import evidenceRouter from './backend/routes/evidence.js';
import claimsRouter from './backend/routes/claims.js';
import biasRouter from './backend/routes/bias.js';
import reportsRouter from './backend/routes/reports.js';
import adminRouter from './backend/routes/admin.js';
import analyticsRouter from './backend/routes/analytics.js';
import organizationRouter from './backend/routes/organization.js';
import departmentsRouter from './backend/routes/departments.js';
import teamsRouter from './backend/routes/teams.js';
import designationsRouter from './backend/routes/designations.js';
import hierarchyRouter from './backend/routes/hierarchy.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Mount API V1 routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/organization', organizationRouter);
  app.use('/api/v1/departments', departmentsRouter);
  app.use('/api/v1/teams', teamsRouter);
  app.use('/api/v1/designations', designationsRouter);
  app.use('/api/v1/hierarchy', hierarchyRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/reviews', reviewsRouter);
  app.use('/api/v1/feedback', feedbackRouter);
  app.use('/api/v1/evidence', evidenceRouter);
  app.use('/api/v1/claims', claimsRouter);
  app.use('/api/v1/bias', biasRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1', adminRouter);
  app.use('/api/v1/analytics', analyticsRouter);

  // Healthcheck
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', name: 'VeriReview AI API', timestamp: new Date().toISOString() });
  });

  // Vite middleware or production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VeriReview AI Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
