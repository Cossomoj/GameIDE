import express from 'express';

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Health server running on port ${port}`);
}); 