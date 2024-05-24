document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM content loaded");
    try {
        initializeElements(); // Initialize elements
        await initializePage();
    } catch (error) {
        console.error('Error initializing page:', error);
    }
});

function initializeElements() {
    const taskDetailsContainer = document.getElementById('taskDetails');
    taskDetailsContainer.innerHTML = `
        <p><strong>Task Description:</strong> <span id="taskDescriptionDisplay"></span></p>
        <input type="text" id="taskDescriptionEdit" style="display: none;">
        <p><strong>Area Selection:</strong> <span id="areaSelectionDisplay"></span></p>
        <select id="areaSelectionEdit" style="display: none;" onchange="populateRoomDropdown(this.value)"></select>
        <p><strong>Room Selection:</strong> <span id="roomSelectionDisplay"></span></p>
        <select id="roomSelectionEdit" style="display: none;"></select>
        <p><strong>Assigned To:</strong> <span id="assignedToDisplay"></span></p>
        <select id="assignedToEdit" style="display: none;"></select>
        <p><strong>Assigned At:</strong> <span id="assignedAtDisplay"></span></p>
        <p><strong>Created By:</strong> <span id="createdByDisplay"></span></p>
        <p><strong>Created At:</strong> <span id="createdAtDisplay"></span></p>
        <p><strong>Completed At:</strong> <span id="completedAtDisplay"></span></p>
        <p><strong>Verified By:</strong> <span id="verifiedByDisplay"></span></p>
        <p><strong>Verified At:</strong> <span id="verifiedAtDisplay"></span></p>
        <p><strong>Verified Failed:</strong> <span id="verifiedFailedDisplay"></span></p>
        <p><strong>Verified Failed At:</strong> <span id="verifiedFailedAtDisplay"></span></p>
        <p><strong>Task ID:</strong> <span id="taskIdDisplay"></span></p>
        <button id="markCompleteBtn" style="display: none;"></button>
        <button id="verifyBtn" style="display: none;"></button>
        <button id="failVerificationBtn" style="display: none;"></button>
        <button id="editTaskBtn" onclick="toggleEdit()">Edit Task</button>
        <button id="updateTaskBtn" style="display: none;" onclick="updateTask()">Update Task</button>
    `;
}


async function initializePage() {
    try {
        await fetchUserDetails();
        const task = await fetchTaskDetails();
        if (task) {
            await fetchRoomDetails(task);
            await fetchUserNames(task); // Fetch usernames for assigned_to, created_by, and verified_by
            populateElements(task); // Populate elements with data
        }
    } catch (error) {
        console.error('Error initializing page:', error);
    }
}

async function fetchTaskDetails() {
    console.log("Fetching task details...");
    const taskId = getTaskIdFromURL();
    console.log("Task ID:", taskId);
    try {
        const response = await fetch(`/tasks/${taskId}`);
        const data = await response.json();
        console.log("Data:", data);
        return data.task;
    } catch (error) {
        console.error('Error fetching task details:', error);
        return null;
    }
}

async function fetchRoomDetails(task) {
    if (task.area_details) {
        try {
            const response = await fetch(`/rooms/${task.area_details}`);
            const room = await response.json();
            task.room_name = room.name;
        } catch (error) {
            console.error('Error fetching room details:', error);
            task.room_name = "Unknown Room";
        }
    } else {
        task.room_name = "No Room Assigned";
    }
}

async function fetchUserDetails() {
    try {
        const response = await fetch(`/user-details`);
        const data = await response.json();
        window.currentUser = data.user;
    } catch (error) {
        console.error('Error fetching user details:', error);
    }
}

async function fetchUserNames(task) {
    if (task.assigned_to) {
        task.assigned_to_name = await fetchUserName(task.assigned_to);
    } else {
        task.assigned_to_name = 'Not Assigned';
    }
    task.created_by_name = await fetchUserName(task.created_by);
    if (task.verified_by) {
        task.verified_by_name = await fetchUserName(task.verified_by);
    } else {
        task.verified_by_name = 'Not Verified';
    }
}

function initializeDropdowns(task) {
    const selectedArea = task.area || '';
    const selectedRoom = task.area_details || '';
    const selectedAssignee = task.assigned_to || '';

    populateAreaDropdown(selectedArea);
    populateRoomDropdown(selectedArea, selectedRoom);
    populateUserDropdown(selectedAssignee);
}

function populateAreaDropdown(selectedArea) {
    const areaSelection = document.getElementById('areaSelectionEdit');
    if (areaSelection) {
        areaSelection.innerHTML = `
            <option value="">Select an Area</option>
            <option value="a_block" ${selectedArea === 'a_block' ? 'selected' : ''}>A Block rooms</option>
            <option value="b_block" ${selectedArea === 'b_block' ? 'selected' : ''}>B Block rooms</option>
            <option value="other" ${selectedArea === 'other' ? 'selected' : ''}>Other Area</option>
        `;
    }
}

async function populateUserDropdown(selectedAssignee) {
    const assignedToDropdown = document.getElementById('assignedToEdit');
    if (assignedToDropdown) {
        assignedToDropdown.innerHTML = ''; 

        try {
            const response = await fetch('/users');
            const users = await response.json();
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.username;
                option.selected = user.id === selectedAssignee;
                assignedToDropdown.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            alert('Failed to fetch users. Please try again later.');
        }
    } else {
        console.error('assignedToDropdown element not found');
    }
}

async function populateRoomDropdown(selectedArea, selectedRoom = '') {
    const roomSelection = document.getElementById('roomSelectionEdit');
    if (roomSelection) {
        roomSelection.innerHTML = ''; 

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a Room';
        roomSelection.appendChild(defaultOption);

        if (selectedArea === 'a_block' || selectedArea === 'b_block' || selectedArea === 'other') {
            try {
                let areaId;
                if (selectedArea === 'a_block') {
                    areaId = 1;
                } else if (selectedArea === 'b_block') {
                    areaId = 2;
                } else if (selectedArea === 'other') {
                    areaId = 3;
                }

                const response = await fetch(`/areas/${areaId}/rooms`);
                const rooms = await response.json();
                console.log(`area ID = ${areaId}, response is ${rooms}`);
                rooms.forEach(room => {
                    const option = document.createElement('option');
                    option.value = room.id;
                    option.textContent = room.name;
                    console.log(`Room.id is ${room.id}, selectedRoom is ${selectedRoom}`);
                    console.log(`Do they equal ${compareIds(room.id, selectedRoom)}`);
                    if (compareIds(room.id, selectedRoom)) {
                        option.selected = true;
                    }
                    roomSelection.appendChild(option);
                });
            } catch (error) {
                console.error('Error fetching rooms:', error);
                alert('Failed to fetch rooms. Please try again later.');
            }
        } else {
            console.error('Invalid area selected');
        }
    } else {
        console.error('roomSelection element not found');
    }
}

function compareIds(id1, id2) {
    if (id1 === null || id2 === null) {
        return false;
    }
    return id1.toString().trim() === id2.toString().trim();
}


function compareIds(id1, id2) {
    if (id1 === null || id2 === null) {
        return false;
    }
    return id1.toString().trim() === id2.toString().trim();
}

function populateElements(task) {
    document.getElementById('taskDescriptionDisplay').textContent = task.task_name;
    document.getElementById('taskDescriptionEdit').value = task.task_name || '';
    document.getElementById('areaSelectionDisplay').textContent = formatAreaSelection(task.area);
    document.getElementById('roomSelectionDisplay').textContent = task.room_name;
    document.getElementById('assignedToDisplay').textContent = task.assigned_to_name;
    document.getElementById('assignedAtDisplay').textContent = formatDate(task.assigned_at) || 'Not Assigned';
    document.getElementById('createdByDisplay').textContent = task.created_by_name;
    document.getElementById('createdAtDisplay').textContent = formatDate(task.created_at);
    document.getElementById('completedAtDisplay').textContent = formatDate(task.completed_at) || 'Not Completed';
    document.getElementById('taskIdDisplay').textContent = task.id;
  
    const verifiedByDisplay = document.getElementById('verifiedByDisplay');
    const verifiedAtDisplay = document.getElementById('verifiedAtDisplay');
    const verifiedFailedDisplay = document.getElementById('verifiedFailedDisplay');
    const verifiedFailedAtDisplay = document.getElementById('verifiedFailedAtDisplay');
  
    if (task.verified_at) {
        verifiedByDisplay.textContent = task.verified_by_name;
        verifiedAtDisplay.textContent = formatDate(task.verified_at) || 'Not Verified';
        verifiedFailedDisplay.textContent = 'No';
        verifiedFailedAtDisplay.textContent = 'Not Applicable';
    } else if (task.verified_failed) {
        verifiedByDisplay.textContent = 'Not Verified';
        verifiedAtDisplay.textContent = 'Not Applicable';
        verifiedFailedDisplay.textContent = 'Yes';
        verifiedFailedAtDisplay.textContent = formatDate(task.verified_failed_at) || 'Not Failed';
    } else {
        verifiedByDisplay.textContent = 'Not Verified';
        verifiedAtDisplay.textContent = 'Not Verified';
        verifiedFailedDisplay.textContent = 'No';
        verifiedFailedAtDisplay.textContent = 'Not Applicable';
    }
  
    const markCompleteBtn = document.getElementById('markCompleteBtn');
    const verifyBtn = document.getElementById('verifyBtn');
    const failVerificationBtn = document.getElementById('failVerificationBtn');
    const editTaskBtn = document.getElementById('editTaskBtn');
  
    if (currentUser.role === 'manager' || task.assigned_to === currentUser.id) {
        if (!task.accepted) {
            markCompleteBtn.textContent = 'Accept Task';
            markCompleteBtn.style.display = 'block';
            markCompleteBtn.onclick = () => acceptTask(task.id);
        } else if (!task.completed_at) {
            markCompleteBtn.textContent = 'Complete Task';
            markCompleteBtn.style.display = 'block';
            markCompleteBtn.onclick = () => markTaskComplete(task.id);
        } else {
            markCompleteBtn.textContent = 'Task Completed';
            markCompleteBtn.style.display = 'none';
        }
  
        if (task.completed_at && !task.verified_at && !task.verified_failed) {
            verifyBtn.textContent = 'Verify Task';
            verifyBtn.style.display = 'block';
            verifyBtn.onclick = () => markTaskVerified(task.id);
  
            failVerificationBtn.textContent = 'Fail Verification';
            failVerificationBtn.style.display = 'block';
            failVerificationBtn.onclick = () => markTaskVerificationFailed(task.id);
        } else if (task.verified_at) {
            verifyBtn.textContent = 'Task Verified';
            verifyBtn.style.display = 'none';
            failVerificationBtn.style.display = 'none';
        } else {
            verifyBtn.textContent = 'Complete Task Before Verifying';
            verifyBtn.style.display = 'none';
            failVerificationBtn.style.display = 'none';
        }
    }
    // Hide edit button for completed or verified tasks
    if (task.completed_at || task.verified_at || task.verified_failed) {
        editTaskBtn.style.display = 'none';
    }
  }
  



function toggleEdit() {
    const displayElements = document.querySelectorAll('#taskDescriptionDisplay, #areaSelectionDisplay, #roomSelectionDisplay, #assignedToDisplay');
    const editElements = document.querySelectorAll('#taskDescriptionEdit, #areaSelectionEdit, #roomSelectionEdit, #assignedToEdit');
    const editBtn = document.getElementById('editTaskBtn');
    const updateBtn = document.getElementById('updateTaskBtn');

    displayElements.forEach(element => {
        element.style.display = element.style.display === 'none' ? 'inline-block' : 'none';
    });

    editElements.forEach(element => {
        element.style.display = element.style.display === 'none' ? 'inline-block' : 'none';
    });

    if (editBtn) {
        editBtn.style.display = editBtn.style.display === 'none' ? 'inline-block' : 'none';
    } else {
        console.error('editTaskBtn element not found');
    }

    if (updateBtn) {
        updateBtn.style.display = updateBtn.style.display === 'none' ? 'inline-block' : 'none';
    } else {
        console.error('updateTaskBtn element not found');
    }

    // Re-populate the dropdowns when entering edit mode
    if (editElements[0].style.display === 'inline-block') {
        fetchTaskDetails().then(task => {
            if (task) {
                initializeDropdowns(task);
            }
        });
    }
}

function updateTask() {
    const taskId = getTaskIdFromURL();
    const taskName = document.getElementById('taskDescriptionEdit').value;
    const taskArea = document.getElementById('areaSelectionEdit').value;
    const areaDetails = document.getElementById('roomSelectionEdit').value;
    const assignedTo = document.getElementById('assignedToEdit').value;
    const unassigned = !assignedTo;

    let stageTemp = 'assignedUnacceptedTasksContainer';
    if (unassigned)
        {
            stageTemp = 'unassignedTasksContainer';
        }

    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_name: taskName, area: taskArea, area_details: areaDetails, assigned_to: assignedTo, stage: stageTemp })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(`Failed to update task: ${err.error}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log('Task updated successfully');
            location.reload();
        } else {
            console.error('Failed to update task:', data.error);
        }
    })
    .catch(error => {
        console.error('Error updating task:', error);
        alert(`Failed to update task: ${error.message}`);
    });
}


function getTaskIdFromURL() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get('taskId');
}

function markTaskComplete(taskId) {
    fetch(`/tasks/${taskId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_at: new Date() })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Task marked as complete successfully');
                location.reload();
            } else {
                console.error('Failed to mark task as complete:', data.error);
            }
        })
        .catch(error => {
            console.error('Error marking task as complete:', error);
        });
}

function markTaskVerified(taskId) {
    fetch(`/tasks/${taskId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified_by: currentUser.id})
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Task marked as verified successfully');
                location.reload();
            } else {
                console.error('Failed to mark task as verified:', data.error);
            }
        })
        .catch(error => {
            console.error('Error marking task as verified:', error);
        });
}
function markTaskVerificationFailed(taskId) {
    fetch(`/tasks/${taskId}/verifyFailed`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified_by: currentUser.id })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Task marked as verification failed successfully');
                location.reload();
            } else {
                console.error('Failed to mark task as verification failed:', data.error);
            }
        })
        .catch(error => {
            console.error('Error marking task as verification failed:', error);
        });
}

function formatAreaSelection(area) {
    switch (area) {
        case 'a_block':
            return 'A Block';
        case 'b_block':
            return 'B Block';
        case 'other':
            return 'Other Area';
        default:
            return 'Not Assigned';
    }
}

function formatDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString();
}

async function fetchUserName(userId) {
    if (!userId) return 'N/A'; // Handle cases where userId is null or undefined
    try {
        const response = await fetch(`/users/${userId}`);
        const user = await response.json();
        if (response.ok) {
            return user.username || 'N/A'; // Return the username or 'N/A' if not found
        } else {
            console.error('Error fetching user details:', user.error);
            return 'N/A';
        }
    } catch (error) {
        console.error('Error fetching user details:', error);
        return 'N/A';
    }
}
