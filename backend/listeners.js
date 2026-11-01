const taskEvents = require('./events');

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

taskEvents.on('task-created', async (task) => {
  try {
    console.log(`[Notification] Handler started at ${new Date().toISOString()}`);
    await delay(2000);

    console.log(
      `[Notification] Task "${task.title}" created at ` +
        `${new Date().toISOString()}; assigned user: ${task.assignedUser || 'Unassigned'}`
    );
  } catch (error) {
    taskEvents.emit('error', error, task);
  }
});

taskEvents.on('task-deleted', (task) => {
  console.log(
    `[Notification] Task "${task.title}" deleted at ${new Date().toISOString()}`
  );
});

taskEvents.on('error', (error, task) => {
  console.error(
    `[Notification Error] Task "${task?.title || 'unknown'}": ${error.message}`
  );
});
