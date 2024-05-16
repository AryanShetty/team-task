function createAcceptButton(taskId) {
  const acceptButton = document.createElement('button');
  acceptButton.textContent = 'Accept Task';
  acceptButton.classList.add('accept-button'); // Add class to accept button
  acceptButton.addEventListener('click', () => acceptTask(taskId));
  return acceptButton;
}

// Function to create reject button
function createRejectButton(taskId) {
  const rejectButton = document.createElement('button');
  rejectButton.textContent = 'Reject Task';
  rejectButton.classList.add('reject-button'); // Add class to reject button
  rejectButton.addEventListener('click', () => rejectTask(taskId));
  return rejectButton;
}

// Update fetchAndDisplayTasks function to use createAcceptButton and createRejectButton
async function fetchAndDisplayTasks() {
  try {
      const response = await fetch('/tasks');
      const tasks = await response.json();
      const tasksContainer = document.getElementById('tasksContainer');
      tasksContainer.innerHTML = ''; // Clear previous tasks

      tasks.forEach(task => {
          const taskElement = document.createElement('div');
          taskElement.className = 'task';
          taskElement.id = `task-${task.id}`; // Assign unique ID using task ID

          // Create a hyperlink for the task details page
          const taskLink = document.createElement('a');
          taskLink.textContent = 'Task Name: ' + task.task_name;
          taskLink.href = `taskDetails.html?taskId=${task.id}`; // Link to taskDetails.html with taskId parameter
          taskLink.classList.add('task-link'); // Add a class for styling if needed
          taskElement.appendChild(taskLink); // Append the hyperlink to the task element

          const area = document.createElement('div');
          area.textContent = 'Area: ' + task.area;
          taskElement.appendChild(area);

          const room = document.createElement('div');
          room.textContent = 'Room: ' + task.area_details;
          taskElement.appendChild(room);

          const assignedTo = document.createElement('div');
          assignedTo.textContent = 'Assigned To: ' + task.assigned_to;
          taskElement.appendChild(assignedTo);

          // Check if the task is already accepted or rejected
          if (task.accepted || task.rejected) {
              // If the task is already accepted or rejected, do not render the buttons
              console.log(`Task ${task.id} is already accepted or rejected. Buttons will not be rendered.`);
          } else {
              // Only show buttons if the user is assigned to the task
              const UserName = String(userInfo.id).trim();
              const AssignedTo = String(task.assigned_to).trim();
              if (UserName === AssignedTo) {
                  const buttonContainer = document.createElement('div');
                  buttonContainer.id = `task-${task.id}-buttons`; // Assign unique ID for the button container
                  buttonContainer.className = 'task-buttons'; // Add class for styling if needed

                  const acceptButton = createAcceptButton(task.id); // Create accept button
                  acceptButton.id = `accept-button-${task.id}`; // Assign unique ID
                  buttonContainer.appendChild(acceptButton);

                  const rejectButton = createRejectButton(task.id); // Create reject button
                  rejectButton.id = `reject-button-${task.id}`; // Assign unique ID
                  buttonContainer.appendChild(rejectButton);

                  taskElement.appendChild(buttonContainer); // Append button container to task element
              }
          }

          tasksContainer.appendChild(taskElement);
      });
  } catch (error) {
      console.error('Error fetching tasks:', error);
      alert('Failed to fetch tasks. Please try again later.');
  }
}