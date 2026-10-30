# Task Manager RESTful API

This project is a RESTful API backend server built using Node.js and Express for a Task Management system. It implements a complete middleware pipeline, including global request logging, input validation, custom error routing, and a centralized error handling mechanism.

[![CI Pipeline](https://github.com/Nirva027/p9---task_manager-api-testing/actions/workflows/ci.yml/badge.svg)](https://github.com/Nirva027/p9---task_manager-api-testing/actions/workflows/ci.yml)

Designed for **ADVANCED WEB DEVELOPMENT FRAMEWORKS (ITUE301) - Practical 4**.

---

## Technical Architecture

```
Client (Postman/Browser)
│
▼
[1. Request Logging Middleware]  <-- Logs method, URL, timestamp
│
▼
[2. Content-Type Validator]      <-- Rejects POST/PUT if not application/json
│
▼
[3. express.json() Parser]       <-- Parses JSON request body
│
▼
Express Router (CRUD Routes)
├── GET /tasks                  --> getAllTasks
├── GET /tasks/:id              --> getTaskById     (uses [4. ID Validator Middleware])
├── POST /tasks                 --> createTask
├── PUT /tasks/:id              --> updateTask      (uses [4. ID Validator Middleware])
└── DELETE /tasks/:id           --> deleteTask      (uses [4. ID Validator Middleware])
│
▼
[5. Undefined Route (404) Handler] <-- Returns structured JSON if route not found
│
▼
[6. Global Error Handler]        <-- Last middleware in chain, returns 500 status
```

---

## Practical Questions & Answers

### 1. Why must the error handling middleware be defined last in the middleware chain?
Express executes middlewares and routes in the exact order they are declared in the code. When an error is triggered (via `throw` or passed to `next(err)`), Express skips all subsequent standard middlewares and searches forward in the pipeline for the next middleware that has exactly four parameters: `(err, req, res, next)`.

If the error handler is defined before a route handler, it will not be in the path of execution when that route handler encounters or propagates an error. Placing it at the very end of the file ensures that any error originating from any preceding middleware or route handler is caught successfully.

### 2. What is the difference between `app.use()` and a route-specific middleware?
*   **`app.use()` (Global Middleware):** Registers middleware that runs for all HTTP verbs (GET, POST, etc.) on the paths matching the route prefix (or all requests if no path is specified). It is typically used for general configurations (like `express.json()`, CORS, and logging).
*   **Route-Specific Middleware:** Passed as arguments directly inside route definitions (e.g., `app.get('/tasks/:id', validateTaskId, ...)`). It executes *only* when a request matches both the exact HTTP method and the path pattern. This is ideal for specific validations (like checking ID format), authentication, or authorization guards.

### 3. Why is it considered bad practice to send raw error stack traces to the client?
*   **Security Vulnerabilities:** Raw stack traces reveal internal details of the server environment, including absolute file system paths, code logic structures, database systems, and dependencies/library versions. Malicious actors can utilize this metadata to identify and exploit security vulnerabilities.
*   **Poor User Experience:** Stack traces are highly technical, unstructured, and confusing for end-users.
*   **Development vs. Production Separation:** Detailed stack traces should be securely printed on the server console or sent to an internal logger for developers to diagnose issues. The client should receive clean, user-friendly, and secure JSON responses like `{ "error": "Internal Server Error", "message": "Something went wrong on the server" }`.

---

## API Documentation & Endpoints

### 1. Retrieve All Tasks
*   **Method:** `GET`
*   **Endpoint:** `/tasks`
*   **Response (200 OK):**
    ```json
    [
      {
        "id": 1,
        "title": "Learn Node.js",
        "description": "Understand the basic JavaScript runtime environment and npm",
        "completed": true,
        "createdAt": "2026-08-02T16:45:37.000Z"
      }
    ]
    ```

### 2. Retrieve Task by ID
*   **Method:** `GET`
*   **Endpoint:** `/tasks/:id`
*   **Response (200 OK):** Returns the matched task.
*   **Response (404 Not Found):** If task does not exist.
*   **Response (400 Bad Request):** If task ID format is invalid (not a positive integer).

### 3. Create Task
*   **Method:** `POST`
*   **Endpoint:** `/tasks`
*   **Headers:** `Content-Type: application/json`
*   **Request Body:**
    ```json
    {
      "title": "Study Express Pipelines",
      "description": "Complete assignment for AWDF Practical 4"
    }
    ```
*   **Response (201 Created):** Returns the created task object with generated `id` and `createdAt`.

### 4. Update Task
*   **Method:** `PUT`
*   **Endpoint:** `/tasks/:id`
*   **Headers:** `Content-Type: application/json`
*   **Request Body (Partial updates allowed):**
    ```json
    {
      "title": "Updated Task Title",
      "completed": true
    }
    ```
*   **Response (200 OK):** Returns the updated task object.

### 5. Delete Task
*   **Method:** `DELETE`
*   **Endpoint:** `/tasks/:id`
*   **Response (200 OK):**
    ```json
    {
      "message": "Task deleted successfully",
      "task": {
        "id": 2,
        "title": "Build an Express Server",
        "description": "Construct a backend server and master the middleware pipeline",
        "completed": false,
        "createdAt": "2026-08-02T16:45:37.000Z"
      }
    }
    ```

---

## Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   npm

### Installation
1.  Navigate to the directory:
    ```bash
    cd task-manager-api
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the Server
Start the development server:
```bash
npm start
```
The server will boot up and listen on port `5000`:
`Server running on port 5000`

### Testing the Server
You can test the server using:
1.  **Postman / Thunder Client** using the routes documented above.
2.  **Automated Script:** Run the built-in test client:
    ```bash
    npm test
    ```

---

## Practical 12: CI Pipeline with GitHub Actions

The [CI Pipeline workflow](.github/workflows/ci.yml) runs on every push to `main`. It checks out the repository, sets up Node.js 18, installs dependencies with `npm install`, starts the API, and runs the existing automated API test suite. A failing test or an API startup failure marks the workflow run as failed.

This practical demonstrates **Continuous Integration (CI)**: changes are automatically built and tested when pushed. **Continuous Deployment (CD)** goes further by automatically releasing successful changes; this workflow does not deploy the application.

Running tests on every push gives quick feedback while the change is fresh and before it is included in a release. A genuine failed assertion and a test file or command path error both fail the workflow, but their logs differ: a failed assertion is reported by the test suite, while an incorrect path produces a command or file-not-found error instead.

To demonstrate both outcomes, temporarily change an assertion in `test-api.js` to an incorrect expected value, commit and push that change to `main`, and inspect the failed run and its logs under the repository's **Actions** tab. Restore the correct expectation, push again, and capture the passing run. Include screenshots of both runs in the lab journal or repository documentation; screenshots must come from the actual GitHub Actions runs.
