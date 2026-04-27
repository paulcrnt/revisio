// hub.js - Gestion du Hub des Matières

const API_URL = window.location.origin;
let subjects = [];
let blocks = [];
let currentSubjectId = null;
let currentBlockId = null;
let currentBlockType = null;

// Charger les matières au démarrage
document.addEventListener('DOMContentLoaded', () => {
    loadSubjects();
});

// ============= API CALLS - SUBJECTS =============

async function loadSubjects() {
    try {
        const response = await fetch(`${API_URL}/api/subjects`);
        subjects = await response.json();
        renderSubjects();
    } catch (error) {
        console.error('Erreur lors du chargement des matières:', error);
    }
}

async function createSubject(subjectData) {
    try {
        const response = await fetch(`${API_URL}/api/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subjectData)
        });
        const result = await response.json();
        if (result.success) {
            subjects.push(result.subject);
            renderSubjects();
            selectSubject(result.subject.id);
        }
    } catch (error) {
        console.error('Erreur lors de la création de la matière:', error);
    }
}

async function updateSubject(id, subjectData) {
    try {
        const response = await fetch(`${API_URL}/api/subjects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subjectData)
        });
        const result = await response.json();
        if (result.success) {
            const index = subjects.findIndex(s => s.id === id);
            if (index !== -1) {
                subjects[index] = { ...subjects[index], ...subjectData };
                renderSubjects();
                if (currentSubjectId === id) {
                    document.getElementById('subject-name').textContent = subjectData.name;
                }
            }
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la matière:', error);
    }
}

async function deleteSubjectById(id) {
    try {
        const response = await fetch(`${API_URL}/api/subjects/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            subjects = subjects.filter(s => s.id !== id);
            renderSubjects();
            if (currentSubjectId === id) {
                currentSubjectId = null;
                showEmptyState();
            }
        }
    } catch (error) {
        console.error('Erreur lors de la suppression de la matière:', error);
    }
}

// ============= GESTION MOBILE =============

function toggleSidebar() {
    const sidebar = document.querySelector('.subjects-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.toggle('active');
    
    // Gérer l'affichage de l'overlay
    if (sidebar.classList.contains('active')) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// ============= API CALLS - BLOCKS =============

async function loadBlocks(subjectId) {
    try {
        const response = await fetch(`${API_URL}/api/subjects/${subjectId}/blocks`);
        blocks = await response.json();
        renderBlocks();
    } catch (error) {
        console.error('Erreur lors du chargement des blocs:', error);
    }
}

async function createBlock(blockData) {
    try {
        const response = await fetch(`${API_URL}/api/blocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(blockData)
        });
        const result = await response.json();
        if (result.success) {
            blocks.push(result.block);
            renderBlocks();
        }
    } catch (error) {
        console.error('Erreur lors de la création du bloc:', error);
    }
}

async function updateBlock(id, blockData) {
    try {
        const response = await fetch(`${API_URL}/api/blocks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(blockData)
        });
        const result = await response.json();
        if (result.success) {
            const index = blocks.findIndex(b => b.id === id);
            if (index !== -1) {
                blocks[index] = { ...blocks[index], ...blockData };
                renderBlocks();
            }
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du bloc:', error);
    }
}

async function deleteBlockById(id) {
    try {
        const response = await fetch(`${API_URL}/api/blocks/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            blocks = blocks.filter(b => b.id !== id);
            renderBlocks();
        }
    } catch (error) {
        console.error('Erreur lors de la suppression du bloc:', error);
    }
}

// ============= RENDER - SUBJECTS =============

function renderSubjects() {
    const listEl = document.getElementById('subjects-list');
    
    if (subjects.length === 0) {
        listEl.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Aucune matière</p>';
        return;
    }
    
    listEl.innerHTML = '';
    subjects.forEach(subject => {
        const item = document.createElement('div');
        item.className = 'subject-item';
        if (subject.id === currentSubjectId) {
            item.classList.add('active');
        }
        item.style.borderLeftColor = subject.color;
        item.innerHTML = `<div class="subject-item-name">${escapeHtml(subject.name)}</div>`;
        item.onclick = () => selectSubject(subject.id);
        listEl.appendChild(item);
    });
}

function selectSubject(id) {
    currentSubjectId = id;
    const subject = subjects.find(s => s.id === id);
    
    if (!subject) return;
    
    // Mettre à jour l'interface
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('subject-content').style.display = 'block';
    document.getElementById('subject-name').textContent = subject.name;
    
    // Recharger les sujets pour mettre à jour l'état actif
    renderSubjects();
    
    // Charger les blocs
    loadBlocks(id);

    // NOUVEAU : Refermer la sidebar sur mobile après avoir cliqué sur une matière
    if (window.innerWidth <= 1024) {
        document.querySelector('.subjects-sidebar').classList.remove('active');
        document.getElementById('sidebar-overlay').classList.remove('active');
    }
}

function showEmptyState() {
    document.getElementById('empty-state').style.display = 'flex';
    document.getElementById('subject-content').style.display = 'none';
}

// ============= RENDER - BLOCKS =============

function renderBlocks() {
    const container = document.getElementById('blocks-container');
    
    if (blocks.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Aucun bloc. Cliquez sur "Ajouter un bloc" pour commencer.</p></div>';
        return;
    }
    
    container.innerHTML = '';
    blocks.sort((a, b) => a.position - b.position).forEach(block => {
        const blockEl = createBlockElement(block);
        container.appendChild(blockEl);
    });
    
}

function createBlockElement(block) {
    const div = document.createElement('div');
    div.className = `content-block block-${block.type}`;
    div.dataset.blockId = block.id;
    
    // Actions
    const actions = `
        <div class="block-actions">
            <button class="block-action-btn" onclick="editBlock(${block.id})" title="Modifier">✏️</button>
        </div>
    `;
    
    let content = '';
    
    switch(block.type) {
        case 'text':
            content = `<div class="block-text">${renderMarkdown(block.content)}</div>`;
            break;
        case 'list':
            content = `<div class="block-list">${formatList(block.content)}</div>`;
            break;

	case 'image':
            const imageData = JSON.parse(block.content);
    
            // Support ancien format (url unique)
            const images = imageData.images || (imageData.url ? [imageData.url] : []);
    
            content = `
                <div class="block-image">
                    <div class="image-gallery">
                        ${images.map((url, index) => `
                             <img src="${url}" alt="Image ${index + 1}" class="gallery-image" onclick="openLightbox(${block.id}, ${index})">
                        `).join('')}
                    </div>
                    ${imageData.caption ? `<div class="block-image-caption">${escapeHtml(imageData.caption)}</div>` : ''}
                </div>
            `;
            break;	

        case 'quote':
            const quoteData = JSON.parse(block.content);
            content = `
                <div class="block-quote">
                    "${escapeHtml(quoteData.text)}"
                    ${quoteData.author ? `<div class="block-quote-author">— ${escapeHtml(quoteData.author)}</div>` : ''}
                </div>
            `;
            break;

	case 'drawing':
    	    content = `
        	<div class="block-drawing">
           	 <canvas id="canvas-${block.id}" width="800" height="600" style="max-width: 100%;"></canvas>
        	</div>
    	   `;
    // On va charger le dessin après le render
    setTimeout(() => loadDrawingToCanvas(block.id, block.content), 100);
    break;
    }
    
    div.innerHTML = actions + content;
    return div;
}

async function handleMultipleImageUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const currentUrls = JSON.parse(document.getElementById('images-urls').value || '[]');
    
    // Upload chaque image
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const response = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                currentUrls.push(result.url);
            }
        } catch (error) {
            console.error('Erreur lors de l\'upload:', error);
            alert('Erreur lors de l\'upload de ' + file.name);
        }
    }
    
    // Mettre à jour l'affichage
    document.getElementById('images-urls').value = JSON.stringify(currentUrls);
    updateImagesPreview(currentUrls);
}

function updateImagesPreview(urls) {
    const container = document.getElementById('images-preview-container');
    
    container.innerHTML = urls.map((url, index) => `
        <div class="image-preview-item">
            <img src="${url}" alt="Image ${index + 1}">
            <button type="button" class="remove-image-btn" onclick="removeImageFromPreview(${index})">✕</button>
        </div>
    `).join('');
}

function removeImageFromPreview(index) {
    const currentUrls = JSON.parse(document.getElementById('images-urls').value || '[]');
    currentUrls.splice(index, 1);
    document.getElementById('images-urls').value = JSON.stringify(currentUrls);
    updateImagesPreview(currentUrls);
}



// ============= MODALS - SUBJECT =============

function openAddSubjectModal() {
    document.getElementById('subject-modal-title').textContent = 'Nouvelle matière';
    document.getElementById('subject-name-input').value = '';
    document.getElementById('subject-color-input').value = '#6366f1';
    document.getElementById('subjectModal').classList.add('active');
}

function editSubject() {
    if (!currentSubjectId) return;
    
    const subject = subjects.find(s => s.id === currentSubjectId);
    if (!subject) return;
    
    document.getElementById('subject-modal-title').textContent = 'Modifier la matière';
    document.getElementById('subject-name-input').value = subject.name;
    document.getElementById('subject-color-input').value = subject.color;
    document.getElementById('subjectModal').classList.add('active');
}

function closeSubjectModal() {
    document.getElementById('subjectModal').classList.remove('active');
    currentSubjectId = null;
}

async function saveSubject() {
    const name = document.getElementById('subject-name-input').value.trim();
    
    if (!name) {
        alert('Le nom de la matière est requis');
        return;
    }
    
    const subjectData = {
        name: name,
        color: document.getElementById('subject-color-input').value
    };
    // Vérifier si on modifie une matière existante
    const existingSubject = currentSubjectId ? subjects.find(s => s.id === currentSubjectId) : null;
    
    if (existingSubject) {
        // Mise à jour
        await updateSubject(currentSubjectId, subjectData);
    } else {
        // Création
        await createSubject(subjectData);
    }
    
    closeSubjectModal();
}

async function deleteSubject() {
    if (!currentSubjectId) return;
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cette matière et tous ses blocs ?')) {
        await deleteSubjectById(currentSubjectId);
    }
}

function setSubjectColor(color) {
    document.getElementById('subject-color-input').value = color;
}

// ============= MODALS - BLOCK TYPE =============

function openAddBlockModal() {
    if (!currentSubjectId) return;
    currentBlockId = null;
    document.getElementById('blockTypeModal').classList.add('active');
}

function closeBlockTypeModal() {
    document.getElementById('blockTypeModal').classList.remove('active');
}

function selectBlockType(type) {
    currentBlockType = type;
    closeBlockTypeModal();
    openBlockEditModal(type);
}

// ============= MODALS - BLOCK EDIT =============

function openBlockEditModal(type, blockId = null) {
    currentBlockType = type;
    currentBlockId = blockId;
    
    const block = blockId ? blocks.find(b => b.id === blockId) : null;
    
    const titles = {
        text: 'Bloc Texte',
        list: 'Bloc Liste',
        drawing: 'Bloc Dessin',
        image: 'Bloc Image',
        quote: 'Citation'
    };
    
    document.getElementById('block-edit-title').textContent = block ? `Modifier ${titles[type]}` : `Ajouter ${titles[type]}`;
    
    const content = document.getElementById('block-edit-content');
    content.innerHTML = getBlockEditor(type, block);
    
    document.getElementById('blockEditModal').classList.add('active');
}

function getBlockEditor(type, block) {
    const content = block ? block.content : '';
    
    switch(type) {
        case 'text':
            return `
                <div class="block-editor">
                    <div class="editor-toolbar">
                        <button class="toolbar-btn" onclick="formatText('bold')"><strong>Gras</strong></button>
                        <button class="toolbar-btn" onclick="formatText('italic')"><em>Italique</em></button>
                        <button class="toolbar-btn" onclick="formatText('h3')">Titre</button>
                    </div>
                    <textarea id="block-content" class="editor-textarea" placeholder="Écrivez votre texte ici...">${content}</textarea>
                    <div class="editor-preview" id="text-preview"></div>
                </div>
            `;
        
        case 'list':
            return `
                <div class="block-editor">
                    <label>
                        <input type="radio" name="list-type" value="ul" ${!content || content.startsWith('<ul>') ? 'checked' : ''}> Liste à puces
                    </label>
                    <label style="margin-left: 1rem;">
                        <input type="radio" name="list-type" value="ol" ${content.startsWith('<ol>') ? 'checked' : ''}> Liste numérotée
                    </label>
                    <textarea id="block-content" class="editor-textarea" placeholder="Un élément par ligne..." style="margin-top: 1rem;">${extractListItems(content)}</textarea>
                </div>
            `;
        
	case 'drawing':
    	    return `
        <div class="block-editor">
            <div class="drawing-toolbar">
                <div class="drawing-tool">
                    <label>Outil</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" class="drawing-tool-btn active" id="draw-btn" onclick="setDrawingTool('draw')">✏️ Crayon</button>
                        <button type="button" class="drawing-tool-btn" id="erase-btn" onclick="setDrawingTool('erase')">🧽 Gomme</button>
                    </div>
                </div>
                
                <div class="drawing-tool">
                    <label for="draw-color">Couleur</label>
                    <input type="color" id="draw-color" value="#000000">
                </div>
                
                <div class="drawing-tool">
                    <label for="draw-size">Taille: <span id="draw-size-value">5</span>px</label>
                    <input type="range" id="draw-size" min="1" max="50" value="5" oninput="document.getElementById('draw-size-value').textContent = this.value">
                </div>
                
                <div class="drawing-tool">
                    <button type="button" class="drawing-tool-btn" onclick="clearCanvas()">🗑️ Effacer tout</button>
                </div>
            </div>
            
            <canvas id="drawing-canvas" width="800" height="600" style="width: 100%; border: 2px solid var(--border-color); border-radius: 8px; background: white; cursor: crosshair;"></canvas>
            <input type="hidden" id="canvas-data" value="${content || ''}">
        </div>
    `;        
	case 'image':
    const imageData = block ? JSON.parse(content) : { images: [], caption: '' };
    
    // Si ancien format (url simple), convertir
    if (imageData.url) {
        imageData.images = [imageData.url];
        delete imageData.url;
    }
    
    return `
        <div class="block-editor">
            <div class="image-upload-area" onclick="document.getElementById('image-input').click()">
                <div class="image-upload-icon">🖼️</div>
                <p>Cliquez pour uploader des images (plusieurs possibles)</p>
                <input type="file" id="image-input" accept="image/*" multiple style="display: none;" onchange="handleMultipleImageUpload(event)">
            </div>
            <div id="images-preview-container" class="images-preview">
                ${imageData.images && imageData.images.length > 0 ? 
                    imageData.images.map((url, index) => `
                        <div class="image-preview-item">
                            <img src="${url}" alt="Image ${index + 1}">
                            <button type="button" class="remove-image-btn" onclick="removeImageFromPreview(${index})">✕</button>
                        </div>
                    `).join('') : ''
                }
            </div>
            <input type="hidden" id="images-urls" value='${JSON.stringify(imageData.images || [])}'>
            <input type="text" id="image-caption" placeholder="Légende (optionnel)" value="${imageData.caption}" 
                   style="width: 100%; margin-top: 1rem; padding: 0.75rem; background: var(--bg-main); border: 2px solid var(--border-color); border-radius: 8px; color: var(--text-primary);">
        </div>
    `;

    }
}

function closeBlockEditModal() {
    document.getElementById('blockEditModal').classList.remove('active');
    currentBlockId = null;
    currentBlockType = null;
}

async function saveBlock() {
    if (!currentSubjectId) return;
    
    let content = '';
    
    switch(currentBlockType) {
        case 'text':
            content = document.getElementById('block-content').value.trim();
            break;
        
        case 'list':
            const listType = document.querySelector('input[name="list-type"]:checked').value;
            const items = document.getElementById('block-content').value.trim().split('\n').filter(line => line.trim());
            const listItems = items.map(item => `<li>${escapeHtml(item.trim())}</li>`).join('');
            content = `<${listType}>${listItems}</${listType}>`;
            break;
        
	case 'drawing':
    	    content = document.getElementById('canvas-data').value;
            if (!content) {
               alert('Le canvas est vide');
            return;
            }
            break;
        
	case 'image':
    	    const imageUrls = JSON.parse(document.getElementById('images-urls').value || '[]');
            const imageCaption = document.getElementById('image-caption').value.trim();
            if (imageUrls.length === 0) {
                alert('Veuillez uploader au moins une image');
                return;
            }
            content = JSON.stringify({ images: imageUrls, caption: imageCaption });
            break;
        
        case 'quote':
            const quoteText = document.getElementById('quote-text').value.trim();
            const quoteAuthor = document.getElementById('quote-author').value.trim();
            if (!quoteText) {
                alert('Veuillez entrer une citation');
                return;
            }
            content = JSON.stringify({ text: quoteText, author: quoteAuthor });
            break;
    }
    
    if (!content && currentBlockType !== 'image' && currentBlockType !== 'quote') {
        alert('Le contenu ne peut pas être vide');
        return;
    }
    
    const blockData = {
        subject_id: currentSubjectId,
        type: currentBlockType,
        content: content,
        position: blocks.length
    };
    
    if (currentBlockId) {
        await updateBlock(currentBlockId, blockData);
    } else {
        await createBlock(blockData);
    }
    
    closeBlockEditModal();
}

async function deleteCurrentBlock() {
    if (!currentBlockId) return;
    
    if (confirm('Êtes-vous sûr de vouloir supprimer ce bloc ?')) {
        await deleteBlockById(currentBlockId);
        closeBlockEditModal();
    }
}

function editBlock(id) {
    const block = blocks.find(b => b.id === id);
    if (!block) return;
    
    openBlockEditModal(block.type, id);
}

// ============= HELPERS =============

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('image-url').value = result.url;
            document.getElementById('image-preview').src = result.url;
            document.getElementById('image-preview-container').style.display = 'block';
        }
    } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
        alert('Erreur lors de l\'upload de l\'image');
    }
}


function formatText(command) {
    const textarea = document.getElementById('block-content');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    let formattedText = '';
    
    switch(command) {
        case 'bold':
            formattedText = `**${selectedText}**`;
            break;
        case 'italic':
            formattedText = `*${selectedText}*`;
            break;
        case 'h3':
            formattedText = `### ${selectedText}`;
            break;
    }
    
    textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
    textarea.focus();
}

function renderMarkdown(content) {
    // Convertir le markdown simple en HTML
    return content
        .replace(/### (.*?)(\n|$)/g, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

function formatList(content) {
    return content;
}

function extractListItems(content) {
    if (!content) return '';
    const match = content.match(/<li>(.*?)<\/li>/g);
    if (!match) return '';
    return match.map(item => item.replace(/<\/?li>/g, '')).join('\n');
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Fermer les modals en cliquant en dehors
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}
// ============= DRAWING FUNCTIONS =============

let drawingCanvas = null;
let drawingCtx = null;
let isDrawing = false;
let currentTool = 'draw';
let currentColor = '#000000';
let currentSize = 5;

function initDrawingCanvas() {
    drawingCanvas = document.getElementById('drawing-canvas');
    if (!drawingCanvas) return;
    
    drawingCtx = drawingCanvas.getContext('2d');
    
    // Charger le dessin existant si présent
    const savedData = document.getElementById('canvas-data').value;
    if (savedData) {
        const img = new Image();
        img.onload = function() {
            drawingCtx.drawImage(img, 0, 0);
        };
        img.src = savedData;
    } else {
        // Fond blanc
        drawingCtx.fillStyle = 'white';
        drawingCtx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    }
    
    // Event listeners
    drawingCanvas.addEventListener('mousedown', startDrawing);
    drawingCanvas.addEventListener('mousemove', draw);
    drawingCanvas.addEventListener('mouseup', stopDrawing);
    drawingCanvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events pour mobile
    drawingCanvas.addEventListener('touchstart', handleTouch);
    drawingCanvas.addEventListener('touchmove', handleTouch);
    drawingCanvas.addEventListener('touchend', stopDrawing);
}

function setDrawingTool(tool) {
    currentTool = tool;
    document.getElementById('draw-btn').classList.toggle('active', tool === 'draw');
    document.getElementById('erase-btn').classList.toggle('active', tool === 'erase');
}

function startDrawing(e) {
    isDrawing = true;
    const rect = drawingCanvas.getBoundingClientRect();
    const scaleX = drawingCanvas.width / rect.width;
    const scaleY = drawingCanvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    drawingCtx.beginPath();
    drawingCtx.moveTo(x, y);
}

function draw(e) {
    if (!isDrawing) return;
    
    const rect = drawingCanvas.getBoundingClientRect();
    const scaleX = drawingCanvas.width / rect.width;
    const scaleY = drawingCanvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    currentColor = document.getElementById('draw-color').value;
    currentSize = document.getElementById('draw-size').value;
    
    drawingCtx.lineWidth = currentSize;
    drawingCtx.lineCap = 'round';
    drawingCtx.strokeStyle = currentTool === 'erase' ? 'white' : currentColor;
    
    drawingCtx.lineTo(x, y);
    drawingCtx.stroke();
}
function stopDrawing() {
    isDrawing = false;
    drawingCtx.beginPath();
    
    // Sauvegarder dans le champ caché
    if (drawingCanvas) {
        document.getElementById('canvas-data').value = drawingCanvas.toDataURL();
    }
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = drawingCanvas.getBoundingClientRect();
    
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        bubbles: true
    });
    
    drawingCanvas.dispatchEvent(mouseEvent);
}
function clearCanvas() {
    if (!drawingCanvas || !drawingCtx) return;
    drawingCtx.fillStyle = 'white';
    drawingCtx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    document.getElementById('canvas-data').value = '';
}

function loadDrawingToCanvas(blockId, dataUrl) {
    if (!dataUrl) return;
    
    const canvas = document.getElementById(`canvas-${blockId}`);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = function() {
        ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
}

// Initialiser le canvas quand le modal s'ouvre
const originalOpenBlockEditModal = openBlockEditModal;
openBlockEditModal = function(type, blockId) {
    originalOpenBlockEditModal(type, blockId);
    if (type === 'drawing') {
        setTimeout(initDrawingCanvas, 100);
    }
};

// ============= LIGHTBOX (IMAGES EN PLEIN ÉCRAN) =============

let lightboxImages = [];
let lightboxCurrentIndex = 0;

function openLightbox(blockId, startIndex) {
    // 1. Trouver le bloc dans notre tableau global
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    // 2. Extraire les images et la légende
    const data = JSON.parse(block.content);
    lightboxImages = data.images || (data.url ? [data.url] : []);
    lightboxCurrentIndex = startIndex;
    const caption = data.caption || '';

    // 3. Récupérer les éléments du DOM
    const lightbox = document.getElementById('imageLightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');

    // 4. Peupler la Lightbox
    lightboxImg.src = lightboxImages[lightboxCurrentIndex];
    lightboxCaption.textContent = caption;
    lightboxCaption.style.display = caption ? 'block' : 'none';

    // 5. Afficher/Cacher les flèches si on a plus d'1 image
    if (lightboxImages.length > 1) {
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
    } else {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }

    // 6. Afficher la Lightbox et bloquer le scroll de la page
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('imageLightbox').classList.remove('active');
    document.body.style.overflow = 'auto'; // Réactiver le scroll
}

function changeLightboxImage(direction) {
    lightboxCurrentIndex += direction;

    // Boucle : si on dépasse la fin, on revient au début (et inversement)
    if (lightboxCurrentIndex >= lightboxImages.length) {
        lightboxCurrentIndex = 0;
    } else if (lightboxCurrentIndex < 0) {
        lightboxCurrentIndex = lightboxImages.length - 1;
    }

    document.getElementById('lightbox-img').src = lightboxImages[lightboxCurrentIndex];
}

// Interactions avancées : Clic à côté pour fermer
document.getElementById('imageLightbox').addEventListener('click', function(event) {
    // Si on clique sur le fond noir (pas sur l'image ou les boutons)
    if (event.target === this) {
        closeLightbox();
    }
});

// Interactions avancées : Clavier (Échap et Flèches)
document.addEventListener('keydown', function(event) {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox && lightbox.classList.contains('active')) {
        if (event.key === 'Escape') closeLightbox();
        if (event.key === 'ArrowLeft') changeLightboxImage(-1);
        if (event.key === 'ArrowRight') changeLightboxImage(1);
    }
});
