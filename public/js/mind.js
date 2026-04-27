// js/mind.js - Gestion des Cartes Mentales pour Revisio

const API_URL = window.location.origin;

// ================= VARIABLES GLOBALES & ÉTAT =================
const workspace = document.getElementById('workspace');
const canvas = document.getElementById('canvas-container');
const svg = document.getElementById('links-svg');

let mindmaps = [];
let currentMapId = null;
let autoSaveTimeout = null; // Timer pour la sauvegarde automatique

let state = {
    mode: 'pan', // 'pan', 'select', 'link'
    nodes: [],
    links: [],
    selectedNodeId: null,
    linkingFromId: null,
    isDragging: false,
    dragTarget: null,
    
    // Pour le pan (déplacement de la caméra)
    panX: -1000,
    panY: -1000,
    isPanning: false,
    startX: 0,
    startY: 0
};

// ================= INITIALISATION & API =================

document.addEventListener('DOMContentLoaded', () => {
    updateTransform();
    loadMindmaps(); // Charge depuis SQLite
});

// 1. Charger les cartes depuis le serveur
async function loadMindmaps() {
    try {
        const response = await fetch(`${API_URL}/api/mindmaps`);
        mindmaps = await response.json();
        renderMapsList();
        showEmptyState();
    } catch (error) {
        console.error('Erreur lors du chargement des cartes:', error);
    }
}

// 2. Sauvegarde automatique en arrière-plan
async function autoSaveCurrentMap() {
    if (!currentMapId) return;
    
    const currentMap = mindmaps.find(m => m.id === currentMapId);
    if (!currentMap) return;

    // Clonage pour éviter les soucis de référence
    currentMap.nodes = JSON.parse(JSON.stringify(state.nodes));
    currentMap.links = JSON.parse(JSON.stringify(state.links));

    try {
        await fetch(`${API_URL}/api/mindmaps/${currentMapId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentMap)
        });
        // Sauvegarde silencieuse réussie
    } catch (error) {
        console.error('Erreur de sauvegarde automatique:', error);
    }
}

// 3. Déclencheur (attend 1s d'inactivité avant de sauvegarder)
function triggerAutoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        autoSaveCurrentMap();
    }, 1000);
}

// ================= GESTION DE L'INTERFACE =================

function showEmptyState() {
    document.getElementById('empty-state').style.display = 'flex';
    document.getElementById('active-workspace').style.display = 'none';
    document.getElementById('mindmap-toolbar').style.display = 'none';
}

function openAddMapModal() {
    document.getElementById('mapModal').classList.add('active');
    document.getElementById('map-name-input').value = '';
}

function closeAddMapModal() {
    document.getElementById('mapModal').classList.remove('active');
}

async function saveMap() {
    const name = document.getElementById('map-name-input').value.trim();
    const color = document.getElementById('map-color-input').value;
    
    if (!name) {
        alert('Le nom de la carte est requis');
        return;
    }

    const newMap = {
        id: 'map_' + Math.random().toString(36).substr(2, 9),
        name: name,
        color: color,
        nodes: [],
        links: []
    };

    try {
        const response = await fetch(`${API_URL}/api/mindmaps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMap)
        });
        const result = await response.json();
        
        if (result.success) {
            mindmaps.push(newMap);
            renderMapsList();
            selectMap(newMap.id);
            closeAddMapModal();
        }
    } catch (error) {
        console.error('Erreur de création:', error);
    }
}

function renderMapsList() {
    const listEl = document.getElementById('mindmaps-list');
    listEl.innerHTML = '';
    
    if (mindmaps.length === 0) {
        listEl.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Aucune carte</p>';
        return;
    }

    mindmaps.forEach(map => {
        const item = document.createElement('div');
        item.className = `subject-item ${map.id === currentMapId ? 'active' : ''}`;
        item.style.borderLeftColor = map.color;
        item.innerHTML = `<div class="subject-item-name">${escapeHtml(map.name)}</div>`;
        item.onclick = () => selectMap(map.id);
        listEl.appendChild(item);
    });
}

async function selectMap(id) {
    // Forcer la sauvegarde immédiate de l'ancienne carte avant de changer
    if (currentMapId) {
        clearTimeout(autoSaveTimeout);
        await autoSaveCurrentMap(); 
    }

    currentMapId = id;
    renderMapsList();

    const map = mindmaps.find(m => m.id === id);
    if (!map) return;

    // Mise à jour de l'UI
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('active-workspace').style.display = 'block';
    document.getElementById('mindmap-toolbar').style.display = 'flex';

    // Nettoyage DOM
    document.querySelectorAll('.mindmap-node').forEach(el => el.remove());
    document.getElementById('links-svg').innerHTML = '';

    // Chargement des données
    state.nodes = JSON.parse(JSON.stringify(map.nodes || []));
    state.links = JSON.parse(JSON.stringify(map.links || []));
    state.selectedNodeId = null;
    state.linkingFromId = null;
    
    state.panX = -1000;
    state.panY = -1000;
    updateTransform();
    setMode('pan');

    // Rendu ou Initialisation
    if (state.nodes.length === 0) {
        const rect = workspace.getBoundingClientRect();
        const startX = -state.panX + (rect.width / 2) - 60;
        const startY = -state.panY + (rect.height / 2) - 30;
        addNode(startX, startY, "Sujet Central");
    } else {
        state.nodes.forEach(node => renderNode(node));
        drawLinks();
    }

    // Mobile UX
    if (window.innerWidth <= 1024) {
        const sidebar = document.querySelector('.subjects-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if(sidebar) sidebar.classList.remove('active');
        if(overlay) overlay.classList.remove('active');
    }
}

// ================= OUTILS =================

function setMode(mode) {
    state.mode = mode;
    state.linkingFromId = null;
    
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`tool-${mode}`);
    if(activeBtn) activeBtn.classList.add('active');
    
    workspace.style.cursor = mode === 'pan' ? 'grab' : 'default';
    document.querySelectorAll('.mindmap-node').forEach(n => n.classList.remove('linking'));
}

// ================= GESTION DES NŒUDS =================

function generateId() {
    return 'node_' + Math.random().toString(36).substr(2, 9);
}

function addNode(x = null, y = null, text = "Nouvelle idée") {
    if (!currentMapId) return;

    if (x === null) {
        const rect = workspace.getBoundingClientRect();
        x = -state.panX + (rect.width / 2) - 60;
        y = -state.panY + (rect.height / 2) - 30;
    }

    const node = { id: generateId(), x, y, text };
    state.nodes.push(node);
    
    renderNode(node);
    setMode('select');
    selectNode(node.id);
    triggerAutoSave(); // <-- Sauvegarde
}

function renderNode(nodeData) {
    const el = document.createElement('div');
    el.className = 'mindmap-node';
    el.id = nodeData.id;
    el.style.left = `${nodeData.x}px`;
    el.style.top = `${nodeData.y}px`;
    
    const input = document.createElement('textarea');
    input.className = 'node-input';
    input.value = nodeData.text;
    input.rows = 1;
    
    input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        nodeData.text = this.value;
        drawLinks();
        triggerAutoSave(); // <-- Sauvegarde
    });

    el.appendChild(input);
    canvas.appendChild(el);

    setTimeout(() => {
        input.style.height = 'auto';
        input.style.height = (input.scrollHeight) + 'px';
    }, 10);

    el.addEventListener('mousedown', (e) => handleNodeDown(e, nodeData.id));
    el.addEventListener('touchstart', (e) => handleNodeDown(e, nodeData.id), {passive: false});
}

function selectNode(id) {
    state.selectedNodeId = id;
    document.querySelectorAll('.mindmap-node').forEach(n => n.classList.remove('selected'));
    if (id) {
        document.getElementById(id).classList.add('selected');
    }
}

function deleteSelected() {
    if (!state.selectedNodeId) return;
    
    document.getElementById(state.selectedNodeId).remove();
    state.nodes = state.nodes.filter(n => n.id !== state.selectedNodeId);
    state.links = state.links.filter(l => l.from !== state.selectedNodeId && l.to !== state.selectedNodeId);
    
    state.selectedNodeId = null;
    drawLinks();
    triggerAutoSave(); // <-- Sauvegarde
}

// ================= GESTION DES LIENS =================

function createLink(fromId, toId) {
    if (fromId === toId) return; 
    
    const exists = state.links.some(l => 
        (l.from === fromId && l.to === toId) || 
        (l.from === toId && l.to === fromId)
    );
    
    if (!exists) {
        state.links.push({ from: fromId, to: toId });
        drawLinks();
        triggerAutoSave(); // <-- Sauvegarde
    }
}

function drawLinks() {
    svg.innerHTML = ''; 
    
    state.links.forEach(link => {
        const elFrom = document.getElementById(link.from);
        const elTo = document.getElementById(link.to);
        
        if (!elFrom || !elTo) return;

        const rectFrom = { x: parseFloat(elFrom.style.left), y: parseFloat(elFrom.style.top), w: elFrom.offsetWidth, h: elFrom.offsetHeight };
        const rectTo = { x: parseFloat(elTo.style.left), y: parseFloat(elTo.style.top), w: elTo.offsetWidth, h: elTo.offsetHeight };

        const x1 = rectFrom.x + (rectFrom.w / 2);
        const y1 = rectFrom.y + (rectFrom.h / 2);
        const x2 = rectTo.x + (rectTo.w / 2);
        const y2 = rectTo.y + (rectTo.h / 2);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${x1} ${y1} C ${x1} ${(y1+y2)/2}, ${x2} ${(y1+y2)/2}, ${x2} ${y2}`;
        
        path.setAttribute('d', d);
        path.setAttribute('class', 'link-line');
        svg.appendChild(path);
    });
}

// ================= INTERACTIONS =================

function handleNodeDown(e, id) {
    if (state.mode === 'pan') return; 
    e.stopPropagation(); 

    if (state.mode === 'select') {
        selectNode(id);
        state.isDragging = true;
        state.dragTarget = document.getElementById(id);
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        state.startX = clientX - parseFloat(state.dragTarget.style.left);
        state.startY = clientY - parseFloat(state.dragTarget.style.top);
    } 
    else if (state.mode === 'link') {
        if (!state.linkingFromId) {
            state.linkingFromId = id;
            document.getElementById(id).classList.add('linking');
        } else {
            createLink(state.linkingFromId, id);
            document.getElementById(state.linkingFromId).classList.remove('linking');
            state.linkingFromId = null;
        }
    }
}

workspace.addEventListener('mousedown', handleBgDown);
workspace.addEventListener('touchstart', handleBgDown, {passive: false});

function handleBgDown(e) {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA') return;
    
    if (state.mode === 'pan') {
        state.isPanning = true;
        workspace.style.cursor = 'grabbing';
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        state.startX = clientX - state.panX;
        state.startY = clientY - state.panY;
    } else {
        selectNode(null); 
    }
}

window.addEventListener('mousemove', handleMove);
window.addEventListener('touchmove', handleMove, {passive: false});

function handleMove(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (state.isDragging && state.dragTarget) {
        e.preventDefault();
        const newX = clientX - state.startX;
        const newY = clientY - state.startY;
        
        state.dragTarget.style.left = `${newX}px`;
        state.dragTarget.style.top = `${newY}px`;
        
        const nodeData = state.nodes.find(n => n.id === state.dragTarget.id);
        if(nodeData) {
            nodeData.x = newX;
            nodeData.y = newY;
        }
        drawLinks(); 
    } 
    else if (state.isPanning) {
        e.preventDefault();
        state.panX = clientX - state.startX;
        state.panY = clientY - state.startY;
        updateTransform();
    }
}

window.addEventListener('mouseup', handleUp);
window.addEventListener('touchend', handleUp);

function handleUp() {
    if (state.isDragging) {
        triggerAutoSave(); // <-- Sauvegarde après un déplacement !
    }
    
    state.isDragging = false;
    state.dragTarget = null;
    
    if (state.isPanning) {
        state.isPanning = false;
        workspace.style.cursor = state.mode === 'pan' ? 'grab' : 'default';
    }
}

function updateTransform() {
    canvas.style.transform = `translate(${state.panX}px, ${state.panY}px)`;
}

// ================= HELPERS =================

function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function toggleSidebar() {
    const sidebar = document.querySelector('.subjects-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if(sidebar && overlay) {
        sidebar.classList.toggle('active');
        if (sidebar.classList.contains('active')) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }
}
