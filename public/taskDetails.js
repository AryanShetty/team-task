document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM content loaded");
    try {
        await initializePage();
    } catch (error) {
        console.error('Error initializing page:', error);
    }
});

async function initializePage() {
    try {
        await fetchUserDetails();
        const task = await fetchTaskDetails();
        if (task) {
            await fetchRoomDetails(task);
            await fetchUserNames(task); // Fetch usernames for assigned_to, created_by, and verified_by
            initializeDropdowns(task);
            displayTaskDetails(task);
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
        const response = await fetch('/user-details');
        const data = await response.json();
        window.currentUser = data.user;
    } catch (error) {
        console.error('Error fetching user details:', error);
    }
}

async function fetchUserNames(task) {
    try {
        task.assigned_to_name = task.assigned_to ? await fetchUserName(task.assigned_to) : 'Not Assigned';
        task.created_by_name = task.created_by ? await fetchUserName(task.created_by) : 'Not Assigned';
        task.verified_by_name = task.verified_by ? await fetchUserName(task.verified_by) : 'Not Verified';
    } catch (error) {
        console.error('Error fetching user names:', error);
    }
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

async function populateRoomDropdown(selectedArea, selectedRoom) {
    const roomSelection = document.getElementById('roomSelectionEdit');
    if (roomSelection) {
        roomSelection.innerHTML = ''; 

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a Room';
        roomSelection.appendChild(defaultOption);

        if (selectedArea === 'a_block' || selectedArea === 'b_block') {
            try {
                const areaId = selectedArea === 'a_block' ? 1 : 2;
                const response = await fetch(`/areas/${areaId}/rooms`);
                const rooms = await response.json();
                rooms.forEach(room => {
                    const option = document.createElement('option');
                    option.value = room.id;
                    option.textContent = room.name;
                    option.selected = room.id === selectedRoom;
                    roomSelection.appendChild(option);
                });
            } catch (error) {
                console.error('Error fetching rooms:', error);
                alert('Failed to fetch rooms. Please try again later.');
            }
        } else if (selectedArea === 'other') {
            const options = ['A Block', 'B Block', 'External Areas'];
            options.forEach(optionText => {
                const option = document.createElement('option');
                option.value = optionText.toLowerCase().replace(' ', '_');
                option.textContent = optionText;
                option.selected = option.value === selectedRoom;
                roomSelection.appendChild(option);
            });
        }
    } else {
        console.error('roomSelection element not found');
    }
}

function displayTaskDetails(task) {
    console.log("Displaying task details:", task);
    const taskDetailsContainer = document.getElementById('taskDetails');

    if (taskDetailsContainer) {
        const isCompleted = !!task.completed_at;
        const isManager = currentUser.role === 'manager';

        let markCompleteBtnText = '';
        let markCompleteBtnOnClick = '';
        let verifyBtnText = '';
        let verifyBtnOnClick = '';

        if (!isCompleted) {
            markCompleteBtnText = 'Complete Task';
            markCompleteBtnOnClick = `markTaskComplete(${task.id})`;
        } else {
            markCompleteBtnText = 'Task Completed';
        }

        if (isManager) {
            if (isCompleted) {
                verifyBtnText = 'Verify Task';
                verifyBtnOnClick = `markTaskVerified(${task.id})`;
            } else {
                verifyBtnText = 'Task Not Complete';
            }
        }

        const markCompleteBtnStyle = markCompleteBtnText ? 'block' : 'none';
        const verifyBtnStyle = verifyBtnText ? 'block' : 'none';

        taskDetailsContainer.innerHTML = `
            <div class="task-detail"><strong>Task Description:</strong> <div>${task.task_name || 'Not Assigned'}</div></div>
            <div class="task-detail"><strong>Area Selection:</strong> <div>${formatAreaSelection(task.area)}</div></div>
            <div class="task-detail"><strong>Room Selection:</strong> <div>${task.room_name || 'Not Assigned'}</div></div>
            <div class="task-detail"><strong>Assigned To:</strong> <div>${task.assigned_to_name || 'Not Assigned'}</div></div>
            <div class="task-detail"><strong>Assigned At:</strong> <div>${formatDate(task.assigned_at) || 'Not Assigned'}</div></div>
            <div class="task-detail"><strong>Created By:</strong> <div>${task.created_by_name || 'Not Assigned'}</div></div>
            <div class="task-detail"><strong>Created At:</strong> <div>${formatDate(task.created_at) || 'Not Assigned'}</div></div>
            <div class="task-detail"><strong>Completed At:</strong> <div>${formatDate(task.completed_at) || 'Not Completed'}</div></div>
            <div class="task-detail"><strong>Verified By:</strong> <div>${task.verified_by_name || 'Not Verified'}</div></div>
            <div class="task-detail"><strong>Verified At:</strong> <div>${formatDate(task.verified_at) || 'Not Verified'}</div></div>
            <div class="task-detail"><strong>Task ID:</strong> <div>${task.id}</div></div>
            <button id="markCompleteBtn" style="display: ${markCompleteBtnStyle}" onclick="${markCompleteBtnOnClick}">${markCompleteBtnText}</button>
            <button id="verifyBtn" style="display: ${verifyBtnStyle}" onclick="${verifyBtnOnClick}">${verifyBtnText}</button>
            <button id="editTaskBtn" onclick="toggleEdit(${task.id})">Edit Task</button>
            <button id="updateTaskBtn" style="display: none;" onclick="updateTask(${task.id})">Update Task</button>
        `;
    } else {
        console.error('taskDetailsContainer element not found');
    }
}

function toggleEdit(taskId) {
    const inputs = document.querySelectorAll('input[type="text"], select');
    const editBtn = document.getElementById('editTaskBtn');
    const updateBtn = document.getElementById('updateTaskBtn');

    inputs.forEach(input => {
        if (input.id.includes('Edit')) {
            input.style.display = input.style.display === 'none' ? 'inline-block' : 'none';
        }
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
    if (inputs[0].style.display === 'inline-block') {
        fetchTaskDetails().then(task => {
            if (task) {
                initializeDropdowns(task);
            }
        });
    }
}

function updateTask(taskId) {
    const taskName = document.getElementById('taskDescriptionEdit').value;
    const taskArea = document.getElementById('areaSelectionEdit').value;
    const areaDetails = document.getElementById('roomSelectionEdit').value;
    const assignedTo = document.getElementById('assignedToEdit').value;

    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_name: taskName, area: taskArea, area_details: areaDetails, assigned_to: assignedTo })
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
        body: JSON.stringify({ verified_by: currentUser.id, verified_at: new Date() })
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
