const express = require('express')
const cors = require('cors')

const authRoutes = require('./src/routes/auth.routes')
const usersRoutes = require('./src/routes/users.routes')
const routinesRoutes = require('./src/routes/routines.routes')
const progressRoutes = require('./src/routes/progress.routes')
const statsRoutes = require('./src/routes/stats.routes')


const app = express()

app.use(cors())
app.use(express.json())

// Rutas API
app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/routines', routinesRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/stats', statsRoutes)

// Ruta de prueba
app.get('/api/ping', (req, res) => {
  res.json({ message: 'GymSync server OK' })
})

const PORT = 3000
app.listen(PORT, () => {
  console.log(`GymSync server escuchando en http://localhost:${PORT}`)
})
