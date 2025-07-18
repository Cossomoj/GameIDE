import gamesRoutes from './routes/games';
import statsRoutes from './routes/stats';
import queueRoutes from './routes/queue';
import interactiveRoutes from './routes/interactive';

// Роуты
app.use('/api/games', gamesRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/interactive', interactiveRoutes); 