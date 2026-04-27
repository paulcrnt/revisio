// server.js - Serveur Node.js pour Revisio
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './data/revisio.db';

// Créer les répertoires nécessaires
const dataDir = path.dirname(DB_PATH);
const uploadsDir = path.join(__dirname, 'uploads');

[dataDir, uploadsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Répertoire créé: ${dir}`);
    }
});

// Configuration de multer pour l'upload d'images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Seules les images sont autorisées'));
        }
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

// Connexion à la base de données SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err);
    } else {
        console.log('✅ Connecté à la base de données SQLite');
        console.log(`📊 Chemin: ${DB_PATH}`);
        initDatabase();
    }
});

// Initialiser la base de données
function initDatabase() {
    // Table pour les tâches (To Do List)
    db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            subject TEXT,
            color TEXT DEFAULT '#6366f1',
            status TEXT DEFAULT 'todo',
            position INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Erreur table tasks:', err);
        else console.log('✅ Table "tasks" prête');
    });

    // Table pour les matières
    db.run(`
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT DEFAULT '#6366f1',
            position INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Erreur table subjects:', err);
        else console.log('✅ Table "subjects" prête');
    });

    // Table pour les blocs de contenu
    db.run(`
        CREATE TABLE IF NOT EXISTS blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            content TEXT,
            position INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('Erreur table blocks:', err);
        else console.log('✅ Table "blocks" prête');
    });

    // NOUVEAU : Table pour les cartes mentales
    db.run(`
        CREATE TABLE IF NOT EXISTS mindmaps (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#ec4899',
            nodes TEXT DEFAULT '[]',
            links TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Erreur table mindmaps:', err);
        else console.log('✅ Table "mindmaps" prête');
    });
}

// ============= ROUTES API =============

// Health check
app.get('/health', (req, res) => {
    db.get('SELECT 1', [], (err) => {
        if (err) {
            res.status(500).json({ status: 'unhealthy', error: err.message });
        } else {
            res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
        }
    });
});

// ============= TASKS (TO DO LIST) =============

// Récupérer toutes les tâches
app.get('/api/tasks', (req, res) => {
    db.all('SELECT * FROM tasks ORDER BY position ASC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Créer une tâche
app.post('/api/tasks', (req, res) => {
    const { title, description, subject, color, status } = req.body;
    
    const sql = `INSERT INTO tasks (title, description, subject, color, status, position) 
                 VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM tasks WHERE status = ?))`;
    
    db.run(sql, [title, description || '', subject || '', color || '#6366f1', status || 'todo', status || 'todo'], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        db.get('SELECT * FROM tasks WHERE id = ?', [this.lastID], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, task: row });
        });
    });
});

// Mettre à jour une tâche
app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, subject, color, status, position } = req.body;
    
    const sql = `UPDATE tasks 
                 SET title = ?, description = ?, subject = ?, color = ?, status = ?, position = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`;
    
    db.run(sql, [title, description, subject, color, status, position, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, changes: this.changes });
    });
});

// Mettre à jour les positions des tâches (pour le drag & drop)
app.post('/api/tasks/reorder', (req, res) => {
    const { tasks } = req.body; // Array of { id, status, position }
    
    const stmt = db.prepare('UPDATE tasks SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        tasks.forEach(task => {
            stmt.run([task.status, task.position, task.id]);
        });
        
        db.run('COMMIT', (err) => {
            if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
            } else {
                res.json({ success: true });
            }
        });
    });
    
    stmt.finalize();
});

// Supprimer une tâche
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, changes: this.changes });
    });
});

// ============= SUBJECTS (MATIÈRES) =============

// Récupérer toutes les matières
app.get('/api/subjects', (req, res) => {
    db.all('SELECT * FROM subjects ORDER BY position ASC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Créer une matière
app.post('/api/subjects', (req, res) => {
    const { name, color } = req.body;
    
    const sql = `INSERT INTO subjects (name, color, position) 
                 VALUES (?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM subjects))`;
    
    db.run(sql, [name, color || '#6366f1'], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        db.get('SELECT * FROM subjects WHERE id = ?', [this.lastID], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, subject: row });
        });
    });
});

// Mettre à jour une matière
app.put('/api/subjects/:id', (req, res) => {
    const { id } = req.params;
    const { name, color } = req.body;
    
    db.run('UPDATE subjects SET name = ?, color = ? WHERE id = ?', [name, color, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, changes: this.changes });
    });
});

// Supprimer une matière
app.delete('/api/subjects/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM subjects WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, changes: this.changes });
    });
});

// ============= BLOCKS (BLOCS DE CONTENU) =============

// Récupérer tous les blocs d'une matière
app.get('/api/subjects/:subjectId/blocks', (req, res) => {
    const { subjectId } = req.params;
    
    db.all('SELECT * FROM blocks WHERE subject_id = ? ORDER BY position ASC', [subjectId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Créer un bloc
app.post('/api/blocks', (req, res) => {
    const { subject_id, type, content } = req.body;
    
    const sql = `INSERT INTO blocks (subject_id, type, content, position) 
                 VALUES (?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM blocks WHERE subject_id = ?))`;
    
    db.run(sql, [subject_id, type, content || '', subject_id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        db.get('SELECT * FROM blocks WHERE id = ?', [this.lastID], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, block: row });
        });
    });
});

// Mettre à jour un bloc
app.put('/api/blocks/:id', (req, res) => {
    const { id } = req.params;
    const { type, content, position } = req.body;
    
    const sql = `UPDATE blocks SET type = ?, content = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    db.run(sql, [type, content, position, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, changes: this.changes });
    });
});

// Supprimer un bloc
app.delete('/api/blocks/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM blocks WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, changes: this.changes });
    });
});

// ============= MINDMAPS (CARTES MENTALES) =============

// Récupérer toutes les cartes
app.get('/api/mindmaps', (req, res) => {
    db.all('SELECT * FROM mindmaps', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Convertir le JSON (texte) de SQLite en vrais objets/tableaux pour le JS
        const maps = rows.map(row => ({
            ...row,
            nodes: JSON.parse(row.nodes || '[]'),
            links: JSON.parse(row.links || '[]')
        }));
        res.json(maps);
    });
});

// Créer une nouvelle carte
app.post('/api/mindmaps', (req, res) => {
    const { id, name, color, nodes, links } = req.body;
    const nodesStr = JSON.stringify(nodes || []);
    const linksStr = JSON.stringify(links || []);

    db.run(`INSERT INTO mindmaps (id, name, color, nodes, links) VALUES (?, ?, ?, ?, ?)`,
        [id, name, color || '#ec4899', nodesStr, linksStr],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, id: id });
        }
    );
});

// Sauvegarder/Mettre à jour une carte existante
app.put('/api/mindmaps/:id', (req, res) => {
    const { name, color, nodes, links } = req.body;
    const nodesStr = JSON.stringify(nodes || []);
    const linksStr = JSON.stringify(links || []);

    db.run(`UPDATE mindmaps SET name = ?, color = ?, nodes = ?, links = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name, color, nodesStr, linksStr, req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, changes: this.changes });
        }
    );
});

// Supprimer une carte
app.delete('/api/mindmaps/:id', (req, res) => {
    db.run(`DELETE FROM mindmaps WHERE id = ?`, [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, changes: this.changes });
    });
});

// ============= UPLOADS =============

// Upload d'image
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Aucune image uploadée' });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: imageUrl });
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Revisio démarré sur http://localhost:${PORT}`);
    console.log(`📊 Base de données: ${DB_PATH}`);
});

// Gestion propre de la fermeture
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('\n👋 Fermeture de la connexion à la base de données');
        process.exit(0);
    });
});
