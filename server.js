import 'dotenv/config'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import NodeCache from 'node-cache'
import Task from './models/Task.js'
import User from './models/User.js'

const app = express()
const port = process.env.PORT || 5000
const jwtSecret = process.env.JWT_SECRET
const taskCache = new NodeCache({ stdTTL: 60, checkperiod: 60 })
const cacheStats = { hits: 0, misses: 0, bypasses: 0 }

app.use(cors())
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

const requireAuth = (request, response, next) => {
  const authorization = request.headers.authorization
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null

  if (!token) return response.status(401).json({ message: 'Authentication required' })

  try {
    request.user = jwt.verify(token, jwtSecret)
    next()
  } catch {
    response.status(401).json({ message: 'Invalid or expired token' })
  }
}

const validateTask = (request, response, next) => {
  const title = typeof request.body?.title === 'string' ? request.body.title.trim() : ''
  if (!title) {
    return response.status(400).json({ message: 'Title is required' })
  }
  request.body.title = title
  next()
}

const validateTaskUpdate = (request, response, next) => {
  if (Object.hasOwn(request.body, 'title')) {
    const title = typeof request.body.title === 'string' ? request.body.title.trim() : ''
    if (!title) {
      return response.status(400).json({ message: 'Title cannot be empty' })
    }
    request.body.title = title
  }
  next()
}

const allTasksCacheKey = (userId) => `tasks:all:${userId}`
const taskCacheKey = (userId, taskId) => `tasks:item:${userId}:${taskId}`

const invalidateTaskCache = (userId, taskId) => {
  taskCache.del(allTasksCacheKey(userId))
  if (taskId) taskCache.del(taskCacheKey(userId, taskId))
}

app.post('/api/auth/register', async (request, response) => {
  try {
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : ''
    const password = typeof request.body.password === 'string' ? request.body.password : ''
    if (!email || password.length < 6) return response.status(400).json({ message: 'Email and a password of at least 6 characters are required' })

    const existingUser = await User.findOne({ email })
    if (existingUser) return response.status(409).json({ message: 'An account with that email already exists' })

    const user = await User.create({ email, password: await bcrypt.hash(password, 10) })
    response.status(201).json({ id: user._id, email: user.email })
  } catch (error) {
    response.status(400).json({ message: error.message })
  }
})

app.post('/api/auth/login', async (request, response) => {
  try {
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : ''
    const password = typeof request.body.password === 'string' ? request.body.password : ''
    const user = await User.findOne({ email })
    const validPassword = user && await bcrypt.compare(password, user.password)
    if (!validPassword) return response.status(401).json({ message: 'Invalid email or password' })

    const token = jwt.sign({ id: user._id.toString(), email: user.email }, jwtSecret, { expiresIn: '1h' })
    response.json({ token, user: { id: user._id, email: user.email } })
  } catch (error) {
    response.status(500).json({ message: error.message })
  }
})

app.get('/api/me', requireAuth, async (request, response) => {
  const user = await User.findById(request.user.id).select('-password')
  if (!user) return response.status(404).json({ message: 'User not found' })
  response.json(user)
})

app.get('/api/tasks', requireAuth, async (request, response) => {
  try {
    const cacheKey = allTasksCacheKey(request.user.id)
    const cacheEnabled = request.query.cache !== 'off'
    if (!cacheEnabled) {
      cacheStats.bypasses += 1
      response.setHeader('X-Cache', 'BYPASS')
    } else {
      const cachedTasks = taskCache.get(cacheKey)
      if (cachedTasks) {
        cacheStats.hits += 1
        response.setHeader('X-Cache', 'HIT')
        return response.json(cachedTasks)
      }
      cacheStats.misses += 1
      response.setHeader('X-Cache', 'MISS')
    }

    const tasks = await Task.find({ userId: request.user.id }).sort({ createdAt: -1 }).lean()
    if (cacheEnabled) taskCache.set(cacheKey, tasks)
    response.json(tasks)
  } catch (error) {
    response.status(500).json({ message: error.message })
  }
})

app.get('/api/tasks/:id', requireAuth, async (request, response) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ message: 'Invalid task id' })
    }

    const cacheKey = taskCacheKey(request.user.id, request.params.id)
    const cacheEnabled = request.query.cache !== 'off'
    if (!cacheEnabled) {
      cacheStats.bypasses += 1
      response.setHeader('X-Cache', 'BYPASS')
    } else {
      const cachedTask = taskCache.get(cacheKey)
      if (cachedTask) {
        cacheStats.hits += 1
        response.setHeader('X-Cache', 'HIT')
        return response.json(cachedTask)
      }
      cacheStats.misses += 1
      response.setHeader('X-Cache', 'MISS')
    }

    const task = await Task.findOne({ _id: request.params.id, userId: request.user.id }).lean()
    if (!task) return response.status(404).json({ message: 'Task not found' })
    if (cacheEnabled) taskCache.set(cacheKey, task)
    response.json(task)
  } catch (error) {
    response.status(500).json({ message: error.message })
  }
})

app.post('/api/tasks', requireAuth, validateTask, async (request, response) => {
  try {
    const task = await Task.create({ ...request.body, userId: request.user.id })
    invalidateTaskCache(request.user.id)
    response.status(201).json(task)
  } catch (error) {
    response.status(400).json({ message: error.message })
  }
})

app.patch('/api/tasks/:id', requireAuth, validateTaskUpdate, async (request, response) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ message: 'Invalid task id' })
    }

    const task = await Task.findOneAndUpdate({ _id: request.params.id, userId: request.user.id }, request.body, {
      new: true,
      runValidators: true,
    })
    if (!task) return response.status(404).json({ message: 'Task not found' })
    invalidateTaskCache(request.user.id, request.params.id)
    response.json(task)
  } catch (error) {
    response.status(400).json({ message: error.message })
  }
})

app.delete('/api/tasks/:id', requireAuth, async (request, response) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ message: 'Invalid task id' })
    }

    const task = await Task.findOneAndDelete({ _id: request.params.id, userId: request.user.id })
    if (!task) return response.status(404).json({ message: 'Task not found' })
    invalidateTaskCache(request.user.id, request.params.id)
    response.status(204).end()
  } catch (error) {
    response.status(400).json({ message: error.message })
  }
})

app.get('/api/debug/cache', requireAuth, (_request, response) => {
  response.json({
    ...cacheStats,
    keys: taskCache.keys().length,
    ttlSeconds: 60,
  })
})

const start = async () => {
  if (!jwtSecret) throw new Error('JWT_SECRET is not set')
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')
  } else {
    console.warn('MONGO_URI is not set; API will start but database requests will fail')
  }

  app.listen(port, () => console.log(`API listening on http://localhost:${port}`))
}

start().catch((error) => {
  console.error(`Unable to start API: ${error.message}`)
  if (error.code === 'ENOTFOUND') {
    console.error('Check MONGO_URI for a valid Atlas cluster hostname and confirm DNS/network access.')
  }
  process.exit(1)
})
