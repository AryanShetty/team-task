// report.js

window.onload = async () => {
  await populateUsersDropdown();
};

async function populateUsersDropdown() {
  const usersDropdown = document.getElementById('users');
  try {
      const response = await fetch('/users');
      const users = await response.json();
      users.forEach(user => {
          const option = document.createElement('option');
          option.value = user.id;
          option.textContent = user.username;
          usersDropdown.appendChild(option);
      });
  } catch (error) {
      console.error('Error fetching users:', error);
      alert('Failed to fetch users. Please try again later.');
  }
}

async function generateReport() {
  const tasksFrom = document.getElementById('tasksFrom').value;
  const tasksTo = document.getElementById('tasksTo').value;
  const userId = document.getElementById('users').value;

  if (!tasksFrom || !tasksTo) {
      alert('Please provide both Tasks From and Tasks To dates.');
      return;
  }

  try {
      const response = await fetch('/generate-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasksFrom, tasksTo, userId })
      });
      const data = await response.json();
      if (data.success) {
          console.log('Tasks received from backend:', data.tasks); // Log tasks received
          const formattedTasks = await formatTasks(data.tasks);
          displayReport(formattedTasks);
      } else {
          console.error('Failed to generate report:', data.error);
      }
  } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again later.');
  }
}

async function formatTasks(tasks) {
  const formattedTasks = [];
  for (const task of tasks) {
      const formattedTask = await formatTask(task);
      formattedTasks.push(formattedTask);
  }
  return formattedTasks;
}

async function formatTask(task) {
  const areaMap = {
      'a_block': 'A Block',
      'b_block': 'B Block',
      'other': 'Other Areas'
  };

  const formattedTask = {
      'Task ID': task.id,
      'Task Name': task.task_name,
      'Area': areaMap[task.area] || 'Unknown Area', // Using areaMap for area values
      'Area Details': await fetchRoomName(task.area_details),
      'Created By': await fetchUserName(task.created_by),
      'Assigned To': await fetchUserName(task.assigned_to),
      'Created At': formatDate(task.created_at),
      'Assigned At': formatDate(task.assigned_at),
      'Completed At': formatDate(task.completed_at),
      'Verified By': await fetchUserName(task.verified_by),
      'Verified At': formatDate(task.verified_at),
      'Accepted': task.accepted ? 'Accepted' : 'Not Accepted',
      'Accepted At': formatDate(task.accepted_at),
      'Rejected': task.rejected ? 'Rejected' : 'Not Rejected',
      'Rejected At': formatDate(task.rejected_at),
      'Completed': task.completed ? 'Completed' : 'Not Completed',
      'Stage': formatStage(task.stage),
      'Unassigned': task.unassigned ? 'Unassigned' : 'Assigned',
      'Verified Failed': task.verified_failed ? 'Failed Verification' : 'N/A',
      'Verified Failed At': formatDate(task.verified_failed_at),
      'Verified': task.verified ? 'Verified' : 'Not Verified'
  };
  return formattedTask;
}

async function fetchRoomName(roomId) {
  try {
      const response = await fetch(`/rooms/${roomId}`);
      const room = await response.json();
      return room.name || 'N/A';
  } catch (error) {
      console.error('Error fetching room name:', error);
      return 'N/A';
  }
}

async function fetchUserName(userId) {
  if (!userId) return 'N/A'; // Return 'N/A' if userId is not provided
  try {
      const response = await fetch(`/users/${userId}`);
      const user = await response.json();
      return user.username || 'N/A';
  } catch (error) {
      console.error('Error fetching user details:', error);
      return 'N/A';
  }
}

function formatBoolean(value) {
  return value ? 'Yes' : 'No';
}

function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} , ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function formatStage(stage) {
  const stageMap = {
      'acceptedTasksContainer': 'Accepted',
      'rejectedTasksContainer': 'Rejected',
      'completedTasksContainer': 'Completed',
      'verifiedTasksContainer': 'Verified',
      'unassignedTasksContainer': 'Unassigned',
      'verifiedFailedTasksContainer': 'Failed Verification'
  };
  return stageMap[stage] || 'Unknown';
}

function displayReport(tasks) {
  const reportResults = document.getElementById('reportResults');
  reportResults.innerHTML = '';

  if (tasks.length === 0) {
      reportResults.textContent = 'No tasks found for the given criteria.';
      return;
  }

  const table = document.createElement('table');
  table.classList.add('report-table');
  const headerRow = document.createElement('tr');

  const headers = [
      'Task ID', 'Task Name', 'Area', 'Area Details', 'Created By', 'Assigned To',
      'Created At', 'Assigned At', 'Completed At', 'Verified By', 'Verified At',
      'Accepted', 'Accepted At', 'Rejected', 'Rejected At', 'Completed', 'Stage',
      'Unassigned', 'Verified Failed', 'Verified Failed At', 'Verified'
  ];

  headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
  });

  table.appendChild(headerRow);

  tasks.forEach(task => {
      const row = document.createElement('tr');
      headers.forEach(header => {
          const td = document.createElement('td');
          td.textContent = task[header];
          row.appendChild(td);
      });
      table.appendChild(row);
  });

  reportResults.appendChild(table);
}
