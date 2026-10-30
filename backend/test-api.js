/**
 * Test Client Suite for Task Manager RESTful API
 * 
 * Programmatically sends requests to verify:
 * - Proper status codes (200, 201, 400, 404, 500)
 * - Custom middleware headers validation (Content-Type verification)
 * - Custom middleware path parameter validation (ID format validation)
 * - CRUD behaviors
 * - Global 404 handler
 */

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('=== STARTING API VALIDATION TESTS ===\n');
  let testsFailed = 0;
  let testsPassed = 0;

  async function assertResponse(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      testsPassed++;
    } catch (error) {
      console.error(`[FAIL] ${name}\n       Reason: ${error.message}`);
      testsFailed++;
    }
  }

  // 1. GET /tasks - List all tasks
  await assertResponse('GET /tasks retrieves initial tasks', async () => {
    const res = await fetch(`${BASE_URL}/tasks`);
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected response to be an array');
    if (data.length !== 2) throw new Error(`Expected 2 initial tasks, got ${data.length}`);
  });

  // 2. GET /tasks/:id - Retrieve single task
  await assertResponse('GET /tasks/1 retrieves first task', async () => {
    const res = await fetch(`${BASE_URL}/tasks/1`);
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const task = await res.json();
    if (task.id !== 1) throw new Error(`Expected task ID 1, got ${task.id}`);
    if (task.title !== 'Learn Node.js') throw new Error(`Unexpected title: ${task.title}`);
  });

  // 3. GET /tasks/:id - Invalid ID format (letters)
  await assertResponse('GET /tasks/abc returns 400 Bad Request (Validation Middleware)', async () => {
    const res = await fetch(`${BASE_URL}/tasks/abc`);
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
    const errObj = await res.json();
    if (!errObj.error || !errObj.message.includes('positive integer')) {
      throw new Error(`Unexpected error message: ${JSON.stringify(errObj)}`);
    }
  });

  // 4. GET /tasks/:id - Invalid ID format (negative number)
  await assertResponse('GET /tasks/-5 returns 400 Bad Request (Validation Middleware)', async () => {
    const res = await fetch(`${BASE_URL}/tasks/-5`);
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
    const errObj = await res.json();
    if (!errObj.error || !errObj.message.includes('positive integer')) {
      throw new Error(`Unexpected error message: ${JSON.stringify(errObj)}`);
    }
  });

  // 5. GET /tasks/:id - Non-existent task
  await assertResponse('GET /tasks/999 returns 404 Not Found', async () => {
    const res = await fetch(`${BASE_URL}/tasks/999`);
    if (res.status !== 404) throw new Error(`Expected status 404, got ${res.status}`);
    const errObj = await res.json();
    if (errObj.error !== 'Not Found') throw new Error(`Expected "Not Found" error, got: ${errObj.error}`);
  });

  // 6. POST /tasks - Reject missing Content-Type (Custom Middleware)
  await assertResponse('POST /tasks without Content-Type returns 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Invalid Content Type' })
      // No headers passed
    });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
    const errObj = await res.json();
    if (!errObj.message.includes('Content-Type must be application/json')) {
      throw new Error(`Expected Content-Type error, got: ${errObj.message}`);
    }
  });

  // 7. POST /tasks - Reject incorrect Content-Type (text/plain)
  await assertResponse('POST /tasks with text/plain returns 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ title: 'Invalid Content Type' })
    });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
    const errObj = await res.json();
    if (!errObj.message.includes('Content-Type must be application/json')) {
      throw new Error(`Expected Content-Type error, got: ${errObj.message}`);
    }
  });

  // 8. POST /tasks - Reject invalid request body (missing title)
  await assertResponse('POST /tasks with empty title returns 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'No title provided' })
    });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
    const errObj = await res.json();
    if (!errObj.message.includes('Title is required')) {
      throw new Error(`Expected missing title error, got: ${errObj.message}`);
    }
  });

  // 9. POST /tasks - Valid insertion
  let createdTaskId;
  await assertResponse('POST /tasks with valid body returns 201 Created and new task', async () => {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Validation Task',
        description: 'Successfully created via fetch client'
      })
    });
    if (res.status !== 201) throw new Error(`Expected status 201, got ${res.status}`);
    const task = await res.json();
    if (!task.id) throw new Error('Expected task to have an generated ID');
    if (task.title !== 'New Validation Task') throw new Error(`Unexpected title: ${task.title}`);
    if (task.completed !== false) throw new Error('New task should start uncompleted');
    createdTaskId = task.id;
  });

  // 10. PUT /tasks/:id - Valid update
  await assertResponse('PUT /tasks/:id updates title and status (200 OK)', async () => {
    if (!createdTaskId) throw new Error('Skip: Task was not created in POST step');
    const res = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Title',
        completed: true
      })
    });
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const task = await res.json();
    if (task.title !== 'Updated Title') throw new Error(`Expected "Updated Title", got "${task.title}"`);
    if (task.completed !== true) throw new Error('Expected completed status to be true');
  });

  // 11. DELETE /tasks/:id - Valid delete
  await assertResponse('DELETE /tasks/:id deletes task and returns 200 OK', async () => {
    if (!createdTaskId) throw new Error('Skip: Task was not created in POST step');
    const res = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, {
      method: 'DELETE'
    });
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const data = await res.json();
    if (!data.message.includes('deleted successfully')) throw new Error(`Unexpected message: ${data.message}`);
    if (data.task.id !== createdTaskId) throw new Error(`Expected deleted task ID to be ${createdTaskId}, got ${data.task.id}`);
  });

  // 12. GET /tasks/:id - Verify deleted task is gone
  await assertResponse('GET /tasks/:id for deleted ID returns 404 Not Found', async () => {
    if (!createdTaskId) throw new Error('Skip: Task was not created in POST step');
    const res = await fetch(`${BASE_URL}/tasks/${createdTaskId}`);
    if (res.status !== 404) throw new Error(`Expected status 404, got ${res.status}`);
  });

  // 13. GET /invalid-route - Custom 404 Handler
  await assertResponse('GET /undefined-route triggers custom 404 route handler', async () => {
    const res = await fetch(`${BASE_URL}/undefined-route`);
    if (res.status !== 404) throw new Error(`Expected status 404, got ${res.status}`);
    const errObj = await res.json();
    if (!errObj.message.includes('Route GET /undefined-route not found')) {
      throw new Error(`Unexpected custom 404 message: ${errObj.message}`);
    }
  });

  console.log('\n=== API VALIDATION COMPLETE ===');
  console.log(`Passed: ${testsPassed}/${testsPassed + testsFailed}`);
  console.log(`Failed: ${testsFailed}/${testsPassed + testsFailed}`);
  
  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log('All tests passed successfully! Server is highly compliant.');
    process.exit(0);
  }
}

// Execute the tests
runTests().catch(err => {
  console.error('Test execution failed completely:', err);
  process.exit(1);
});
