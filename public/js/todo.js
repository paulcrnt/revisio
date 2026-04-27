// todo.js - Gestion de la To Do List avec Drag & Drop

const API_URL = window.location.origin;
let tasks = [];
let currentTaskId = null;

// Charger les tâches au démarrage
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
});

// ============= API CALLS =============

async function loadTasks() {
    try {
        const response = await fetch(`${API_URL}/api/tasks`);
        tasks = await response.json();
        renderTasks();
    } catch (error) {
        console.error('Erreur lors du chargement des tâches:', error);
    }
}

async function createTask(taskData) {
    try {
        const response = await fetch(`${API_URL}/api/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        const result = await response.json();
        if (result.success) {
            tasks.push(result.task);
            renderTasks();
        }
    } catch (error) {
        console.error('Erreur lors de la création de la tâche:', error);
    }
}

async function updateTask(id, taskData) {
    try {
        const response = await fetch(`${API_URL}/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        const result = await response.json();
        if (result.success) {
            const index = tasks.findIndex(t => t.id === id);
            if (index !== -1) {
                tasks[index] = { ...tasks[index], ...taskData };
                renderTasks();
            }
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la tâche:', error);
    }
}

async function deleteTaskById(id) {
    try {
        const response = await fetch(`${API_URL}/api/tasks/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            tasks = tasks.filter(t => t.id !== id);
            renderTasks();
        }
    } catch (error) {
        console.error('Erreur lors de la suppression de la tâche:', error);
    }
}

async function updateTasksOrder(tasksToUpdate) {
    try {
        await fetch(`${API_URL}/api/tasks/reorder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks: tasksToUpdate })
        });
    } catch (error) {
        console.error('Erreur lors de la réorganisation:', error);
    }
}

// ============= RENDER =============

function renderTasks() {
    const columns = ['todo', 'inprogress', 'done'];
    
    columns.forEach(status => {
        const column = document.getElementById(`column-${status}`);
        const columnTasks = tasks.filter(t => t.status === status).sort((a, b) => a.position - b.position);
        
        // Mettre à jour le compteur
        document.getElementById(`count-${status}`).textContent = columnTasks.length;
        
        // Vider la colonne
        column.innerHTML = '';
        
        // Ajouter les tâches
        if (columnTasks.length === 0) {
            column.innerHTML = `
                <div class="empty-state">
                    <p>Aucune tâche</p>
                </div>
            `;
        } else {
            columnTasks.forEach(task => {
                const card = createTaskCard(task);
                column.appendChild(card);
            });
        }
    });
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.taskId = task.id;
    card.style.borderLeftColor = task.color;
    
    card.innerHTML = `
        <div class="task-header">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-actions">
                <button class="task-action-btn" onclick="editTask(${task.id})" title="Modifier">
                    ✏️
                </button>
            </div>
        </div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-footer">
            ${task.subject ? `<span class="task-subject" style="background: ${task.color}20; color: ${task.color}">${escapeHtml(task.subject)}</span>` : '<span></span>'}
        </div>
    `;
    
    // Événements drag & drop
    card.addEventListener('dragstart', dragStart);
    card.addEventListener('dragend', dragEnd);
    
    return card;
}

// ============= DRAG & DROP =============

let draggedElement = null;

function dragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function dragEnd(e) {
    this.classList.remove('dragging');
}

function allowDrop(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function drop(e) {
    e.preventDefault();
    
    if (!draggedElement) return;
    
    const dropColumn = e.currentTarget;
    const newStatus = dropColumn.id.replace('column-', '');
    const taskId = parseInt(draggedElement.dataset.taskId);
    
    // Ajouter l'élément à la nouvelle colonne
    if (dropColumn.querySelector('.empty-state')) {
        dropColumn.innerHTML = '';
    }
    dropColumn.appendChild(draggedElement);
    
    // Mettre à jour la position et le statut
    const newColumnTasks = Array.from(dropColumn.children);
    const tasksToUpdate = [];
    
    newColumnTasks.forEach((card, index) => {
        const id = parseInt(card.dataset.taskId);
        const task = tasks.find(t => t.id === id);
        
        if (task) {
            task.status = newStatus;
            task.position = index;
            tasksToUpdate.push({
                id: id,
                status: newStatus,
                position: index
            });
        }
    });
    
    // Envoyer la mise à jour au serveur
    updateTasksOrder(tasksToUpdate);
    
    // Re-render pour mettre à jour les compteurs
    renderTasks();
}

// ============= MODAL =============

function openAddTaskModal() {
    currentTaskId = null;
    document.getElementById('modal-title').textContent = 'Nouvelle tâche';
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-subject').value = '';
    document.getElementById('task-color').value = '#6366f1';
    document.getElementById('task-status').value = 'todo';
    document.getElementById('delete-task-btn').style.display = 'none';
    
    document.getElementById('taskModal').classList.add('active');
}

function editTask(id) {
    currentTaskId = id;
    const task = tasks.find(t => t.id === id);
    
    if (!task) return;
    
    document.getElementById('modal-title').textContent = 'Modifier la tâche';
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-subject').value = task.subject || '';
    document.getElementById('task-color').value = task.color;
    document.getElementById('task-status').value = task.status;
    document.getElementById('delete-task-btn').style.display = 'block';
    
    document.getElementById('taskModal').classList.add('active');
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('active');
    currentTaskId = null;
}

async function saveTask() {
    const title = document.getElementById('task-title').value.trim();
    
    if (!title) {
        alert('Le titre est requis');
        return;
    }
    
    const taskData = {
        title: title,
        description: document.getElementById('task-description').value.trim(),
        subject: document.getElementById('task-subject').value.trim(),
        color: document.getElementById('task-color').value,
        status: document.getElementById('task-status').value,
        position: 0
    };
    
    if (currentTaskId) {
        // Mise à jour
        await updateTask(currentTaskId, taskData);
    } else {
        // Création
        await createTask(taskData);
    }
    
    closeTaskModal();
}

async function deleteTask() {
    if (!currentTaskId) return;
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
        await deleteTaskById(currentTaskId);
        closeTaskModal();
    }
}

function setColor(color) {
    document.getElementById('task-color').value = color;
}

// ============= UTILS =============

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Fermer le modal en cliquant en dehors
window.onclick = function(event) {
    const modal = document.getElementById('taskModal');
    if (event.target === modal) {
        closeTaskModal();
    }
}
