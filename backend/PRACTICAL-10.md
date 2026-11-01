# Practical 10: Asynchronous Processing with EventEmitter

This practical adds in-process background notifications to the Task Management API using Node.js's built-in `EventEmitter`.

## Event flow

```text
POST /tasks
  -> validate and save task
  -> send 201 response
  -> emit task-created
  -> listener waits 2 seconds, then logs title, timestamp, and assigned user
```

The shared emitter is defined in `events.js`. `server.js` loads `listeners.js` once during startup so the listeners are registered before any route emits an event. Deleting a task emits `task-deleted`. Errors in the asynchronous creation listener are caught and sent to a registered `error` listener.

`EventEmitter.emit()` invokes listeners synchronously; it does not wait for an async listener's promise. The creation listener demonstrates deferred work with a two-second timer. The API logs when its response is sent, and the listener logs its completion later.

## Run and verify

From the repository root, start the backend:

```powershell
cd D:\portfolio\p9-task-manager-api-testing\backend
npm start
```

In another terminal, run the API test suite:

```powershell
cd D:\portfolio\p9-task-manager-api-testing\backend
npm test
```

The tests verify that task creation returns its assigned user and retains the expected response shape. In the server console, the API response and notification-start timestamps should appear before the notification-completion message, which is delayed by approximately two seconds. Deleting a task logs a separate notification.

To try the create endpoint manually, send a JSON `POST` to `http://localhost:5000/tasks`:

```json
{
  "title": "Prepare Practical 10",
  "description": "Demonstrate event-driven notification processing",
  "assignedUser": "Asha"
}
```

## Questions

1. **Why does the event not block the response?** `emit()` invokes its listener immediately, but the listener schedules its remaining work after an `await` on a timer. The route does not await that promise.
2. **What if notification work runs directly in the route?** Waiting for slow work before sending the response makes clients wait for it too.
3. **Why is EventEmitter suitable at this scale but not for millions of events per day?** It is simple for a small, single-process application, but events are neither persisted nor shared across server instances and are lost if the process stops. A high-volume system generally needs a durable message broker and worker processes.

## Submission evidence

Capture the API response and server console output showing the response-before-notification-completion ordering. Keep the two-second delay enabled for the demonstration.
