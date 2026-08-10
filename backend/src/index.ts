import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import projectRoutes from './routes/projects.routes';
import taskRoutes from './routes/tasks.routes';
import materialsRoutes from './routes/materials.routes';
import issuesRoutes from './routes/issues.routes';
import prisma from './prismaClient';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import usersRoutes from './routes/users.routes';
import activityLogsRoutes from './routes/activityLogs.routes';
import accountingRoutes from './routes/accounting.routes';
import fieldLogsRoutes from './routes/fieldLogs.routes';

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/activity-logs', activityLogsRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/field-logs', fieldLogsRoutes);

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(__dirname, '../../storage/uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

app.listen(port, async () => {
  console.log(`Server is running on port ${port}`);

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection is OK');
  } catch (error) {
    console.error('Database connection failed');
    console.error(error);
  }
});
