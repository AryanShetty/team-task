const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const { Pool } = require('pg');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 3000;
app.use(express.json());
app.use(cookieParser());



// PostgreSQL database connection configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'taskapp',
  password: 'WhySettle@2911',
  port: 5432,
});

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

app.use(express.static('public', {
  setHeaders: (res, path, stat) => {
      if (path.endsWith('.js')) {
          res.set('Content-Type', 'text/javascript');
      }
  }
}));

// Serve taskDisplay.html
app.get('/taskDisplay', (req, res) => {
  if (req.session.user) {
    res.sendFile(path.join(__dirname, 'public', 'taskDisplay.html'));
  } else {
    res.redirect('/');
  }
});

// Routes
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
      const client = await pool.connect();
      const query = 'SELECT * FROM users WHERE username = $1 AND password = $2';
      const result = await client.query(query, [username, password]);
      client.release();
      if (result.rows.length > 0) {
          const user = result.rows[0];
          req.session.user = user;
          res.json({ success: true, user_id: user.user_id, username: user.username, role: user.role });
      } else {
          res.json({ success: false });
      }
  } catch (error) {
      console.error('Error logging in user:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
  }
});


app.post('/tasks', async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'User not authenticated' });
  }

  const { task_name, areaSelection, roomSelection, assigned_to } = req.body;
  const created_by = req.session.user.user_id;
  let assignedUser = null;

  if (req.session.user.role === 'manager' || req.session.user.role === 'owner') {
    assignedUser = assigned_to; // Assign tasks if the user is a manager or owner
  }

  let unassigned = !assignedUser;
  let assigned_at = unassigned ? null : new Date(); // Set the current timestamp if assignedUser is not null

  try {
    const client = await pool.connect();
    const query = `
      INSERT INTO tasks (task_name, created_by, assigned_to, area, area_details, created_at, assigned_at, completed_at, verified_by, verified_at, stage, unassigned)
      VALUES ($1, $2, $3, $4, $5, DEFAULT, $6, DEFAULT, DEFAULT, DEFAULT, $7, $8)
      RETURNING id, created_at, assigned_at, completed_at, verified_by, verified_at, stage, unassigned
    `;
    const stage = unassigned ? 'unassignedTasksContainer' : 'assignedUnacceptedTasksContainer';
    const result = await client.query(query, [task_name, created_by, assignedUser, areaSelection, roomSelection, assigned_at, stage, unassigned]);
    client.release();
    const task = result.rows[0];

    res.json({ success: true, task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});



// Define a new route to fetch tasks
app.get('/tasks', async (req, res) => {
  if (!req.session.user) {
      return res.json({ success: false, error: 'User not authenticated' });
  }

  const userId = req.session.user.user_id;
  const isManager = req.session.user.role === 'manager' || req.session.user.role === 'owner';
  console.log(`User ID: ${userId}, Is Manager: ${isManager}`);

  try {
      let query;
      let queryParams = [];

      if (isManager) {
          query = 'SELECT * FROM tasks WHERE completed_at IS NULL';
      } else {
          query = 'SELECT * FROM tasks WHERE completed_at IS NULL AND assigned_to = $1';
          queryParams = [userId];
      }

      const client = await pool.connect();
      const result = await client.query(query, queryParams);
      client.release();
      const tasks = result.rows;
      res.json(tasks);
  } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Define endpoint to delete tasks
app.delete('/tasks/:taskId', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'User not authenticated' });
  }

  const userId = req.session.user.user_id;
  const userRole = req.session.user.role;
  const taskId = req.params.taskId;

  if (userRole !== 'owner') {
    return res.status(403).json({ success: false, error: 'User not authorized to delete tasks' });
  }

  try {
    const client = await pool.connect();
    const query = 'DELETE FROM tasks WHERE id = $1';
    await client.query(query, [taskId]);
    client.release();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/tasks/:taskId', async (req, res) => {
  const taskId = req.params.taskId;

  try {
    const client = await pool.connect();
    const query = 'SELECT * FROM tasks WHERE id = $1';
    const result = await client.query(query, [taskId]);
    client.release();
    const task = result.rows[0];
    if (!task) {
      res.json({ success: false, error: 'Task not found' });
    } else {
      res.json({ success: true, task });
    }
  } catch (error) {
    console.error('Error fetching task details:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.put('/tasks/:taskId', async (req, res) => {
  const taskId = req.params.taskId;
  const { task_name, area, area_details, assigned_to, stage } = req.body;

  try {
      const client = await pool.connect();

      // Check if the task exists
      const checkQuery = 'SELECT * FROM tasks WHERE id = $1';
      const checkResult = await client.query(checkQuery, [taskId]);
      
      if (checkResult.rows.length === 0) {
          client.release();
          return res.status(404).json({ success: false, error: 'Task not found' });
      }

      // Update the task
      const updateQuery = `
          UPDATE tasks 
          SET task_name = $1, area = $2, area_details = $3, assigned_to = $4,assigned_at = NOW(), stage = $5, 
          accepted = false, rejected = false, accepted_at = NULL, rejected_at = NULL
          WHERE id = $6
          RETURNING *
      `;
      const values = [task_name, area, area_details, assigned_to, stage, taskId];
      const updateResult = await client.query(updateQuery, values);
      client.release();

      return res.json({ success: true, message: 'Task updated successfully', task: updateResult.rows[0] });
  } catch (error) {
      console.error('Error updating task:', error);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.post('/tasks/:taskId/accept', async (req, res) => {
  const taskId = req.params.taskId;
  try {
      // Update the task in the database to mark it as accepted and set the accepted timestamp
      const client = await pool.connect();
      const query = 'UPDATE tasks SET accepted = true, accepted_at = NOW(), stage = $1 WHERE id = $2';
      await client.query(query, ['acceptedTasksContainer', taskId]);
      client.release();
      res.json({ success: true });
  } catch (error) {
      console.error('Error accepting task:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Endpoint to reject a task
app.post('/tasks/:taskId/reject', async (req, res) => {
  const taskId = req.params.taskId;
  try {
      // Update the task in the database to mark it as rejected and set the rejected timestamp
      const client = await pool.connect();
      const query = 'UPDATE tasks SET rejected = true, rejected_at = NOW(), stage = $1 WHERE id = $2';
        await client.query(query, ['rejectedTasksContainer', taskId]);
      client.release();
      res.json({ success: true });
  } catch (error) {
      console.error('Error rejecting task:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/logout', (req, res) => {
    res.clearCookie('user');
    req.session.destroy();
    res.end();
});

// Routes
app.get('/users', async (req, res) => {
    try {
      const client = await pool.connect();
      const query = 'SELECT user_id, username FROM users';
      const result = await client.query(query);
      client.release();
      const users = result.rows.map(row => ({
        id: row.user_id,
        username: row.username
      }));
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// Define route handler for fetching rooms based on area
app.get('/areas/:areaId/rooms', async (req, res) => {
  const areaId = req.params.areaId;

  try {
    const client = await pool.connect();
    const query = 'SELECT * FROM rooms WHERE area_id = $1';
    const result = await client.query(query, [areaId]);
    client.release();
    const rooms = result.rows;
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/rooms', async (req, res) => {
  try {
      const client = await pool.connect();
      const query = 'SELECT * FROM rooms';
      const result = await client.query(query);
      client.release();
      const rooms = result.rows;
      res.json(rooms);
      console.log(rooms)
  } catch (error) {
      console.error('Error fetching rooms:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});
  
// Define route handler for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

(async () => {
  try {
      await fetchTasksFromDatabase();
      // Once tasks are fetched, start the server
      app.listen(PORT, () => {
          console.log(`Server running on port ${PORT}`);
      });
  } catch (error) {
      console.error('Error starting the server:', error);
  }
})();

// Define currentUser object
let currentUser = {
  id: null,
  username: null,
  role: null
};

// GET endpoint to fetch user details
app.get('/user-details', (req, res) => {
  res.json({
      success: true,
      user: req.cookies.user || currentUser // Use cookies if available, otherwise use currentUser
  });
});

// POST endpoint to update user details
app.post('/user-details', (req, res) => {
  const { id, username, role } = req.body;
  // Update currentUser object with new user details
  currentUser = { id, username, role };
  // Set user details in cookies
  res.cookie('user', currentUser, { maxAge: 900000, httpOnly: true }); // Set cookie for 15 minutes
  console.log(`User updated with id ${currentUser.id}, username ${currentUser.username}, role ${currentUser.role}`);
  res.json({
      success: true,
      message: 'User details updated successfully'
  });
});

// Endpoint to mark a task as complete
app.put('/tasks/:taskId/complete', async (req, res) => {
  const taskId = req.params.taskId;
  try {
      const client = await pool.connect();
      const query = 'UPDATE tasks SET completed = true, completed_at = NOW(), stage = $1 WHERE id = $2';
      await client.query(query, ['completedTasksContainer', taskId]);
      client.release();
      res.json({ success: true });
  } catch (error) {
      console.error('Error completing task:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Endpoint to mark a task as verified
app.put('/tasks/:taskId/verify', async (req, res) => {
  const taskId = req.params.taskId;
  const { verified_by, verified_at } = req.body;
  try {
      const client = await pool.connect();
      const query = 'UPDATE tasks SET verified_by = $1, verified_at = NOW(), stage = $2, verified = TRUE WHERE id = $3';
      await client.query(query, [verified_by,'verifiedTasksContainer', taskId]);
      client.release();
      res.json({ success: true });
  } catch (error) {
      console.error('Error verifying task:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Endpoint to mark a task as verification failed
app.put('/tasks/:taskId/verifyFailed', async (req, res) => {
  const taskId = req.params.taskId;
  const { verified_by } = req.body;
  try {
      const client = await pool.connect();
      const query = 'UPDATE tasks SET verified_failed = TRUE, verified_failed_at = NOW(), stage = $1 WHERE id = $2';
      await client.query(query, ['verifiedFailedTasksContainer', taskId]);
      client.release();
      res.json({ success: true });
  } catch (error) {
      console.error('Error marking task as verification failed:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
  }
});


// Define endpoint to fetch rejected tasks
app.get('/fetchTasks/rejected', async (req, res) => {
  try {
    const query = `
      SELECT * FROM tasks 
      WHERE rejected = true 
      AND stage = 'rejectedTasksContainer' 
      AND rejected_at >= NOW() - INTERVAL '1 day'
      ORDER BY rejected_at DESC;
    `;
    const result = await pool.query(query);
    const rejectedTasks = result.rows;
    console.log(rejectedTasks);
    res.json(rejectedTasks);
  } catch (error) {
    console.error('Error fetching rejected tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Define endpoint to fetch accepted tasks
app.get('/fetchTasks/accepted', async (req, res) => {
  try {
    const query = `SELECT * FROM tasks WHERE accepted = true and stage = 'acceptedTasksContainer' ORDER BY accepted_at DESC;`;
    const result = await pool.query(query);
    const acceptedTasks = result.rows;
    res.json(acceptedTasks);
  } catch (error) {
    console.error('Error fetching accepted tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Define endpoint to fetch completed tasks
app.get('/fetchTasks/completed', async (req, res) => {
  try {
    const query = `SELECT * FROM tasks WHERE completed = true and (stage = 'completedTasksContainer') ORDER BY completed_at;`;
    const result = await pool.query(query);
    const completedTasks = result.rows;
    res.json(completedTasks);
  } catch (error) {
    console.error('Error fetching completed tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Define endpoint to fetch verified tasks
app.get('/fetchTasks/verified', async (req, res) => {
  const todayDate = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

  try {
    const query = `
      SELECT * FROM tasks 
      WHERE tasks.verified = true 
      AND tasks.stage = 'verifiedTasksContainer'
      AND tasks.verified_at::date = $1::date
      ORDER BY tasks.verified_at DESC;
    `;
    const params = [todayDate];
    console.log('Executing Query:', query, 'with params:', params); // Log the query and parameters for debugging
    const result = await pool.query(query, params);
    const verifiedTasks = result.rows;
    console.log('Query Result:', verifiedTasks); // Log the query result
    res.json(verifiedTasks);
  } catch (error) {
    console.error('Error fetching verified tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Define endpoint to fetch unassigned tasks
app.get('/fetchTasks/unassigned', async (req, res) => {
  try {
      const query = 'SELECT * FROM tasks WHERE unassigned = true ORDER BY created_at DESC;';
      const result = await pool.query(query);
      const unassignedTasks = result.rows;
      res.json(unassignedTasks);
  } catch (error) {
      console.error('Error fetching unassigned tasks:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/fetchTasks/assignedUnaccepted', async (req, res) => {
  try {
    const query = `
      SELECT * FROM tasks
      WHERE assigned_to IS NOT NULL
        AND (accepted IS NULL OR accepted = false)
        AND (rejected IS NULL OR rejected = false)
        AND (completed IS NULL OR completed = false)
        AND (verified_by IS NULL)
        ORDER BY created_at DESC;
    `;
    const result = await pool.query(query);
    const assignedUnacceptedTasks = result.rows;
    res.json(assignedUnacceptedTasks);
  } catch (error) {
    console.error('Error fetching assigned but unaccepted tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Define endpoint to fetch completed tasks
app.get('/fetchTasks/verifiedFailed', async (req, res) => {
  try {
    const query = `SELECT * FROM tasks WHERE verified_failed = true and stage = 'verifiedFailedTasksContainer' ORDER BY verified_failed_at DESC;`;
    const result = await pool.query(query);
    const completedTasks = result.rows;
    res.json(completedTasks);
  } catch (error) {
    console.error('Error fetching Verified Failed tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

let tasks = [];

// Function to fetch tasks from the database and populate the tasks array
async function fetchTasksFromDatabase() {
    try {
        const client = await pool.connect();
        const query = 'SELECT * FROM tasks';
        const result = await client.query(query);
        client.release();
        tasks = result.rows;
        console.log('Tasks fetched from the database:', tasks[1]);
    } catch (error) {
        console.error('Error fetching tasks from the database:', error);
    }
}

app.get('/rooms/:roomId', async (req, res) => {
  const roomId = parseInt(req.params.roomId, 10);
  
  if (isNaN(roomId)) {
      return res.status(400).json({ error: 'Invalid room ID' });
  }
  console.log(roomId);
  try {
      const client = await pool.connect();
      const query = 'SELECT name FROM rooms WHERE id = $1;';
      const result = await client.query(query, [roomId]);
      client.release();

      if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Room not found' });
      }

      const room = result.rows[0];
      res.json(room);
  } catch (error) {
      console.error('Error fetching room details:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/users/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
      const client = await pool.connect();
      const query = 'SELECT user_id, username FROM users WHERE user_id = $1';
      const result = await client.query(query, [userId]);
      client.release();
      if (result.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
      }
      const user = result.rows[0];
      res.json(user);
  } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to trigger stage update
app.post('/update-task-stages', async (req, res) => {
  try {
      await updateTaskStages();
      res.json({ success: true, message: 'Task stages updated successfully' });
  } catch (error) {
      console.error('Error updating task stages:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Function to update task stages
const updateTaskStages = async () => {
  try {
      const client = await pool.connect();

      // Condition 1: Assigned but not accepted, rejected, completed, or verified
      await client.query(`
          UPDATE tasks 
          SET stage = 'assignedUnacceptedTasksContainer'
          WHERE created_at IS NOT NULL 
          AND accepted = false 
          AND rejected = false 
          AND completed = false 
          AND verified_at IS NULL;
      `);

      // Condition 2: Rejected tasks
      await client.query(`
          UPDATE tasks 
          SET stage = 'rejectedTasksContainer'
          WHERE rejected = true 
          AND completed = false 
          AND verified_at IS NULL;
      `);

      // Condition 3: Accepted but not completed or verified
      await client.query(`
          UPDATE tasks 
          SET stage = 'acceptedTasksContainer'
          WHERE accepted = true 
          AND completed = false 
          AND verified_at IS NULL;
      `);

      // Condition 4: Completed tasks but not verified
      await client.query(`
          UPDATE tasks 
          SET stage = 'completedTasksContainer'
          WHERE completed = true 
          AND verified_at IS NULL;
      `);

      // Condition 5: Verified tasks
      await client.query(`
          UPDATE tasks 
          SET stage = 'verifiedTasksContainer'
          WHERE verified_at IS NOT NULL;
      `);

      // Condition 6: Unassigned tasks
      await client.query(`
          UPDATE tasks 
          SET stage = 'unassignedTasksContainer'
          WHERE unassigned = true;
      `);

      client.release();
      console.log('Task stages updated successfully');
  } catch (error) {
      console.error('Error updating task stages:', error);
  }
}

app.get('/report', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

app.post('/generate-report', async (req, res) => {
  const { tasksFrom, tasksTo, userId, stage } = req.body;
  let query = `
      SELECT
          tasks.id,
          tasks.task_name,
          tasks.area,
          tasks.area_details,
          tasks.created_by,
          tasks.assigned_to,
          tasks.created_at,
          tasks.assigned_at,
          tasks.completed_at,
          tasks.verified_by,
          tasks.verified_at,
          tasks.accepted,
          tasks.accepted_at,
          tasks.rejected,
          tasks.rejected_at,
          tasks.completed,
          tasks.stage,
          tasks.unassigned,
          tasks.verified_failed,
          tasks.verified_failed_at,
          tasks.verified
      FROM tasks
      WHERE tasks.created_at >= $1 AND tasks.created_at < $2::date + INTERVAL '1 day'
  `;

  const params = [tasksFrom, tasksTo];

  if (userId) {
      query += ` AND tasks.assigned_to = $3`;
      params.push(userId);
  }

  if (stage) {
      query += ` AND tasks.stage = $${params.length + 1}`;
      params.push(stage);
  }

  query += ` ORDER BY tasks.created_at DESC`;

  try {
      const result = await pool.query(query, params);
      const tasks = result.rows;
      res.json({ success: true, tasks });
  } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
  }
});