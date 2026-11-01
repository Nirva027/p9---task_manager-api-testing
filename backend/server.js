/**
 * ADVANCED WEB DEVELOPMENT FRAMEWORKS (ITUE301)
 * Practical 4: Building a RESTful API with Node.js and Express
 * 
 * Core server implementation incorporating:
 * - Custom global logging middleware
 * - Content-Type validation middleware for JSON payloads
 * - Route-specific task ID validator middleware
 * - RESTful CRUD routing using in-memory array storage
 * - 404 handler for undefined routes
 * - Global centralized error handling middleware
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const taskEvents = require('./events');
require('./listeners');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data', 'tasks.json');

// ==========================================
// File-backed task storage
// ==========================================
let tasks = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
let nextId = tasks.reduce((highestId, task) => Math.max(highestId, task.id), 0) + 1;

const saveTasks = () => {
  fs.writeFileSync(DATA_FILE, `${JSON.stringify(tasks, null, 2)}\n`);
};

// ==========================================
// Custom Middlewares
// ==========================================

// 1. Global Request Logger Middleware
// Logs HTTP method, URL, and current timestamp to console
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// 2. Content-Type Validator Middleware for POST/PUT
// Rejects requests without a Content-Type: application/json header
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.startsWith('application/json')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content-Type must be application/json'
      });
    }
  }
  next();
});

// JSON body parsing middleware (placed after Content-Type check to avoid parsing garbage data)
app.use(express.json());

// 3. Route-Specific Task ID Validator Middleware
// Validates that the task ID parameter is a positive integer
const validateTaskId = (req, res, next) => {
  const idParam = req.params.id;
  const idNum = parseInt(idParam, 10);
  
  if (!/^\d+$/.test(idParam) || isNaN(idNum) || idNum <= 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid task ID format. Task ID must be a positive integer.'
    });
  }
  
  // Attach parsed ID to req object for controllers to use directly
  req.taskId = idNum;
  next();
};

// ==========================================
// REST API Endpoints (CRUD)
// ==========================================

// GET /tasks - Retrieve all tasks
app.get('/tasks', (req, res) => {
  res.status(200).json(tasks);
});

// GET /tasks/:id - Retrieve a task by ID (uses validateTaskId middleware)
app.get('/tasks/:id', validateTaskId, (req, res) => {
  const task = tasks.find(t => t.id === req.taskId);
  if (!task) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Task with ID ${req.taskId} not found`
    });
  }
  res.status(200).json(task);
});

// POST /tasks - Create a new task (uses JSON payload validation)
app.post('/tasks', (req, res) => {
  const { title, description, assignedUser } = req.body;

  // Validate required input
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Title is required and must be a non-empty string'
    });
  }

  if (assignedUser !== undefined && typeof assignedUser !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Assigned user must be a string'
    });
  }

  const newTask = {
    id: nextId++,
    title: title.trim(),
    description: typeof description === 'string' ? description.trim() : '',
    completed: false,
    createdAt: new Date().toISOString()
  };

  if (assignedUser !== undefined && assignedUser.trim() !== '') {
    newTask.assignedUser = assignedUser.trim();
  }

  tasks.push(newTask);
  saveTasks();
  res.status(201).json(newTask);
  console.log(`[API] Response sent at ${new Date().toISOString()}`);
  taskEvents.emit('task-created', newTask);
});

// PUT /tasks/:id - Update an existing task (uses validateTaskId middleware)
app.put('/tasks/:id', validateTaskId, (req, res) => {
  const task = tasks.find(t => t.id === req.taskId);
  if (!task) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Task with ID ${req.taskId} not found`
    });
  }

  const { title, description, completed } = req.body;

  // Validate fields if they are provided
  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Title must be a non-empty string'
    });
  }

  if (completed !== undefined && typeof completed !== 'boolean') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Completed status must be a boolean value'
    });
  }

  // Update properties
  if (title !== undefined) task.title = title.trim();
  if (description !== undefined) task.description = typeof description === 'string' ? description.trim() : '';
  if (completed !== undefined) task.completed = completed;

  saveTasks();
  res.status(200).json(task);
});

// DELETE /tasks/:id - Delete a task (uses validateTaskId middleware)
app.delete('/tasks/:id', validateTaskId, (req, res) => {
  const taskIndex = tasks.findIndex(t => t.id === req.taskId);
  if (taskIndex === -1) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Task with ID ${req.taskId} not found`
    });
  }

  const deletedTask = tasks.splice(taskIndex, 1)[0];
  saveTasks();
  res.status(200).json({
    message: 'Task deleted successfully',
    task: deletedTask
  });
  taskEvents.emit('task-deleted', deletedTask);
});

// ==========================================
// Fallback & Error Handling Middlewares
// ==========================================

// 4. Custom 404 Handler for Undefined Routes
// Matches anything that was not caught by defined route paths
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// 5. Global Centralized Error Handler Middleware
// Captures synchronous and async errors passed to next(err)
app.use((err, req, res, next) => {
  console.error('Unhandled exception caught by error handler:\n', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong on the server'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
