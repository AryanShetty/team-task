let userInfo = {
    id: null,
    username: null,
    role: null
};

// Function to handle login
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    fetch('/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Set userInfo object with user details upon successful login
            userInfo.id = data.user_id;
            userInfo.username = data.username;
            userInfo.role = data.role;

            // Send user details to /user-details endpoint
            fetch('/user-details', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    id: userInfo.id,
                    username: userInfo.username,
                    role: userInfo.role
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('User details sent to /user-details endpoint');
                } else {
                    console.error('Failed to send user details to /user-details endpoint');
                }
            });

            document.getElementById('login').style.display = 'none';
            document.getElementById('taskManager').style.display = 'block';
            if (data.role === 'manager') {
                document.getElementById('taskForm').style.display = 'block';
            }
            // Call fetchAndDisplayTasks only after successful login
            fetchAndDisplayTasks(data.role === 'manager' ? null : data.user_id);
        } else {
            alert('Login failed!');
        }
    });
}

function logout() {
    fetch('/logout')
    .then(() => {
        // Clear userInfo object upon logout
        userInfo.id = null;
        userInfo.username = null;
        userInfo.role = null;

        // Send user details to /user-details endpoint
        fetch('/user-details', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(userInfo)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('User details sent to /user-details endpoint');
            } else {
                console.error('Failed to send user details to /user-details endpoint');
            }
        });

        document.getElementById('login').style.display = 'block';
        document.getElementById('taskManager').style.display = 'none';
        document.getElementById('taskForm').style.display = 'none';
    });
}

function assignTask() {
    const task_name = document.getElementById('taskDescription').value;
    const assigned_to = document.getElementById('assignedTo').value;
    const areaSelection = document.getElementById('areaSelection');
    const roomSelection = document.getElementById('roomSelection');

    // Get the values of the selected options before resetting
    const selectedArea = areaSelection.value;
    const selectedRoom = roomSelection.value;

    fetch('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_name, assigned_to, areaSelection: selectedArea, roomSelection: selectedRoom })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Reset the dropdowns back to their default options
            areaSelection.value = '';
            roomSelection.value = '';
            
            // After assigning the task, fetch and display all tasks
            fetchAndDisplayTasks();
        } else {
            alert('Task assignment failed!');
        }
    })
    .catch(error => {
        console.error('Error assigning task:', error);
        alert('Failed to assign task. Please try again later.');
    });
}



function displayTaskForm() {
    document.getElementById('taskForm').style.display = 'block';
}



// Function to create accept button
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
async function displayRejectedTasks() {
    try {
        console.log("Fetching rejected tasks...");
        const response = await fetch('/fetchTasks/rejected');
        const rejectedTasks = await response.json();
        console.log("Received rejected tasks:", rejectedTasks); // Debugging statement
        const rejectedTasksContainer = document.getElementById('rejectedTasksContainer');
        rejectedTasksContainer.innerHTML = ''; // Clear previous tasks

        if (Array.isArray(rejectedTasks)) {
            rejectedTasks.forEach(task => {
                console.log("Displaying rejected task:", task);
                const taskElement = createTaskElement(task);
                rejectedTasksContainer.appendChild(taskElement);
            });
        } else {
            console.error("Rejected tasks is not an array:", rejectedTasks); // Debugging statement
            // Handle the error or display a message to the user
        }
    } catch (error) {
        console.error('Error fetching and displaying rejected tasks:', error);
    }
}

// Function to display accepted tasks
async function displayAcceptedTasks() {
    try {
        console.log("Fetching accepted tasks...");
        const response = await fetch('/fetchTasks/accepted');
        const acceptedTasks = await response.json();
        const acceptedTasksContainer = document.getElementById('acceptedTasksContainer');
        acceptedTasksContainer.innerHTML = ''; // Clear previous tasks

        acceptedTasks.forEach(task => {
            console.log("Displaying accepted task:", task);
            const taskElement = createTaskElement(task);
            acceptedTasksContainer.appendChild(taskElement);
        });
    } catch (error) {
        console.error('Error fetching and displaying accepted tasks:', error);
    }
}

// Function to display completed tasks
async function displayCompletedTasks() {
    try {
        console.log("Fetching completed tasks...");
        const response = await fetch('/fetchTasks/completed');
        const completedTasks = await response.json();
        const completedTasksContainer = document.getElementById('completedTasksContainer');
        completedTasksContainer.innerHTML = ''; // Clear previous tasks

        completedTasks.forEach(task => {
            console.log("Displaying completed task:", task);
            const taskElement = createTaskElement(task);
            completedTasksContainer.appendChild(taskElement);
        });
    } catch (error) {
        console.error('Error fetching and displaying completed tasks:', error);
    }
}

// Function to display verified tasks
async function displayVerifiedTasks() {
    try {
        console.log("Fetching verified tasks...");
        const response = await fetch('/fetchTasks/verified');
        const verifiedTasks = await response.json();
        const verifiedTasksContainer = document.getElementById('verifiedTasksContainer');
        verifiedTasksContainer.innerHTML = ''; // Clear previous tasks

        verifiedTasks.forEach(task => {
            console.log("Displaying verified task:", task);
            const taskElement = createTaskElement(task);
            verifiedTasksContainer.appendChild(taskElement);
        });
    } catch (error) {
        console.error('Error fetching and displaying verified tasks:', error);
    }
}

// Function to display unassigned tasks
async function displayUnassignedTasks() {
    try {
        console.log("Fetching unassigned tasks...");
        const response = await fetch('/fetchTasks/unassigned');
        const unassignedTasks = await response.json();
        const unassignedTasksContainer = document.getElementById('unassignedTasksContainer');
        unassignedTasksContainer.innerHTML = ''; // Clear previous tasks

        unassignedTasks.forEach(task => {
            console.log("Displaying unassigned task:", task);
            const taskElement = createTaskElement(task);
            unassignedTasksContainer.appendChild(taskElement);
        });
    } catch (error) {
        console.error('Error fetching and displaying unassigned tasks:', error);
    }
}

async function displayAssignedUnacceptedTasks() {
    try {
        const response = await fetch('/fetchTasks/assignedUnaccepted');
        const assignedUnacceptedTasks = await response.json();
        const assignedUnacceptedTasksContainer = document.getElementById('assignedUnacceptedTasksContainer');
        assignedUnacceptedTasksContainer.innerHTML = '';

        assignedUnacceptedTasks.forEach(task => {
            const taskElement = createTaskElement(task);
            assignedUnacceptedTasksContainer.appendChild(taskElement);
        });
    } catch (error) {
        console.error('Error fetching and displaying assigned but unaccepted tasks:', error);
    }
}

// Helper function to create a task element
function createTaskElement(task) {
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

    return taskElement;
}



// Call the populateDropdown and fetchAndDisplayTasks functions when the page loads
window.onload = () => {
    populateAssignedToDropdown(); // Call the function to populate the assignedTo dropdown
};

async function populateRoomDropdown() {
    console.log('populateRoomDropdown function called');
    const areaSelection = document.getElementById('areaSelection');
    const roomSelection = document.getElementById('roomSelection');
    const selectedArea = areaSelection.value;

    roomSelection.innerHTML = ''; // Clear previous options

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select';
    roomSelection.appendChild(defaultOption);

    if (selectedArea === 'a_block' || selectedArea === 'b_block') {
        try {
            // Fetch rooms for A Block or B Block using area IDs
            const areaId = selectedArea === 'a_block' ? 1 : 2; // A Block's ID is 1, B Block's ID is 2
            const response = await fetch(`/areas/${areaId}/rooms`);
            const rooms = await response.json();

            rooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room.id;
                option.textContent = room.name;
                roomSelection.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching rooms:', error);
            alert('Failed to fetch rooms. Please try again later.');
        }
    } else if (selectedArea === 'other') {
        // Show options for A Block, B Block, and External Areas
        const options = ['A Block', 'B Block', 'External Areas'];
        options.forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText.toLowerCase().replace(' ', '_');
            option.textContent = optionText;
            roomSelection.appendChild(option);
        });
    } else {
        // If none of the above, clear room selection
        roomSelection.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select an option';
        roomSelection.appendChild(defaultOption);
    }
}

async function populateAssignedToDropdown() {
    const assignedToDropdown = document.getElementById('assignedTo');
    assignedToDropdown.innerHTML = ''; // Clear previous options

    try {
        const response = await fetch('/users');
        const users = await response.json();

        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.username;
            assignedToDropdown.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        alert('Failed to fetch users. Please try again later.');
    }
}

// Function to handle accepting a task
async function acceptTask(taskId) {
    try {
        const response = await fetch(`/tasks/${taskId}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
            // If the request is successful, fetch and display tasks again
            fetchAndDisplayTasks();
            // Hide the accept and reject buttons for this task
            hideButtons(taskId);
            
            // Display a message indicating the task was accepted
            displayMessage('Task accepted successfully.');

        } else {
            console.error('Error accepting task:', response.statusText);
            alert('Failed to accept task. Please try again later.');
        }
    } catch (error) {
        console.error('Error accepting task:', error);
        alert('Failed to accept task. Please try again later.');
    }
}

// Function to handle rejecting a task
async function rejectTask(taskId) {
    try {
        const response = await fetch(`/tasks/${taskId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
            // If the request is successful, fetch and display tasks again
            fetchAndDisplayTasks();
            // Hide the accept and reject buttons for this task
            hideButtons(taskId);
            // Display a message indicating the task was rejected
            displayMessage('Task rejected successfully.');
        } else {
            console.error('Error rejecting task:', response.statusText);
            alert('Failed to reject task. Please try again later.');
        }
    } catch (error) {
        console.error('Error rejecting task:', error);
        alert('Failed to reject task. Please try again later.');
    }
}

// Function to hide accept and reject buttons for a task
function hideButtons(taskId) {
    console.log("Trying to hide buttons for task ID:", taskId);
    
    const buttonContainer = document.getElementById(`task-${taskId}-buttons`);

    if (buttonContainer) {
        buttonContainer.classList.add('hidden');
        console.log("Hide buttons container");
    }
}


// Function to display a message on the screen
function displayMessage(message) {
    const messageElement = document.getElementById('message');
    if (messageElement) {
        messageElement.textContent = message;
        // Show the message for a few seconds and then hide it
        setTimeout(() => {
            messageElement.textContent = '';
        }, 3000);
    }
}

// Call the functions to display tasks when the page loads
async function fetchAndDisplayTasks() {
    try {
        await displayRejectedTasks();
        await displayAcceptedTasks();
        await displayCompletedTasks();
        await displayVerifiedTasks();
        await displayUnassignedTasks();
        await displayAssignedUnacceptedTasks();
    } catch (error) {
        console.error('Error fetching and displaying tasks:', error);
    }
}
