// Passenger (DreamHost) entry point
// Passenger sets PORT automatically and expects the app to listen on it
const app = require('./server.cjs')
const PORT = process.env.PORT || 3002
app.listen(PORT, () => {
  console.log(`KitsunePaint (Passenger) running on port ${PORT}`)
})
