const express = require('express');
const cors = require('cors');
const pg = require('pg');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true if using HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8 // 8 hours
  }
}));

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'file')));


// Database
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
let dbConnected = false;

// Start server
async function startServer() {
  try {
    await client.connect();
    dbConnected = true;
    console.log('✅ Connected to Supabase');
  } catch (err) {
    console.warn('❌ Database connection failed — starting server anyway:', err.message);
  }

  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
}

startServer();



app.get('/', getfile);
function getfile(req, res) {
    res.sendFile(path.join(__dirname, '..', 'file','html','index.html'));
}
// Serve images
app.use('/file', express.static(path.join(__dirname,'..', 'file')));

    // Routes for HTML pages
app.get('/serveur.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'file','html','serveur.html'));
});

app.get('/gerant.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'file','html','gerant.html'));
});

app.get('/parametre.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'file','html','parametre.html'));
});

app.get('/coffe.svp', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'file','html','coffe.svp'));
});

app.get('/statistique.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'file','html','statistique.html'));
});

app.get('/toaledejour.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'file','html','toaledejour.html'));
});

app.get('/totaledejour.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'file','html','totaledejour.html'));
});


app.post('/api/auth', async (req, res) => {
    if (!dbConnected) {
        return res.status(503).json({ ok: false, error: 'Database not connected' });
    }

    const code = req && req.body ? String(req.body.code ?? '') : '';
    if (!code) {
        return res.status(400).json({ ok: false, error: 'Missing code' });
    }

    try {
        const gerantResult = await client.query(
            'SELECT name, password FROM users WHERE password = $1 and type=$2',
            [code, 'gerant']
        );

        if (gerantResult.rows && gerantResult.rows.length > 0) {
            const user = gerantResult.rows[0];
            req.session.user = { name: user.name, type: 'gerant' };
            return res.json({ ok: true, role: 'gerant', username: user.name, redirect: '/gerant.html' });
        }

        const serveurResult = await client.query(
            'SELECT name, password FROM users WHERE password = $1 and type=$2',
            [code, 'serveur']
        );
        if (serveurResult.rows && serveurResult.rows.length > 0) {
            const user = serveurResult.rows[0];
            req.session.user = { name: user.name, type: 'serveur' };
            return res.json({ ok: true, role: 'serveur', username: user.name, redirect: '/serveur.html' });
        }

        return res.status(401).json({ ok: false, error: 'Invalid code' });
    } catch (err) {
        console.error('POST /api/auth failed:', err && err.message ? err.message : err);
        return res.status(500).json({ ok: false, error: 'Authentication failed' });
    }
});

function isSixDigitNumeric(value) {
    return typeof value === 'string' && /^\d{6}$/.test(value);
}

app.get('/api/gerants', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    try {
        const result = await client.query('SELECT name FROM users ORDER BY name');
        return res.json(result.rows);
    } catch (err) {
        console.error('GET /api/gerants failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to load gerants' });
    }
});

app.post('/api/gerants', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  const name = String(req.body?.name ?? '').trim();
  const password = String(req.body?.password);


  const verify = await client.query(
    'SELECT 1 FROM users WHERE password=$1',
    [password]
  );

  if (verify.rows.length > 0) {
    return res.status(400).json({ error: 'changer le mot passe     ' });
  }

  try {
    const result = await client.query(
      'INSERT INTO users(name, password, type) VALUES ($1, $2, $3) RETURNING *',
      [name, password, 'gerant']
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/gerants failed:', err);
    return res.status(500).json({ error: 'Failed to create gerant' });
  }
});


app.put('/api/gerants/:id/password', async (req, res) => {
    console.log('Received request to update gerant password');
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const id = String(req.params.id);
    const password = req && req.body ? String(req.body.password ?? '') : '';
    console.log(`Updating password for gerant id: ${id}`);
    console.log(`New password: ${password}`);
    const verify = await client.query(
    'SELECT 1 FROM users WHERE password=$1',
    [password]
  );
  if(verify.rowCount>0){
    return res.status(400).json({ error: 'changer le mot passe     ' });
  }
    try {
        const result = await client.query(
            'UPDATE users SET password = $1 WHERE name = $2 AND type = $3',
            [password, id, 'gerant']
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Gerant not found' });
        return res.json({ ok: true });
    } catch (err) {
        console.log('PUT /api/gerants/:id/password failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to update gerant password' });
    }
});

app.delete('/api/gerants/:id', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const id = String(req.params.id);
    
    try {
        const result = await client.query('DELETE FROM users WHERE name = $1 and type=$2' , [id,'gerant']);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Gerant not found' });
        return res.json({ ok: true });
    } catch (err) {
        console.error('DELETE /api/gerants/:id failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to delete gerant' });
    }
});

app.get('/api/serveurs', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    try {
        const result = await client.query('SELECT  name FROM users where type=$1 ORDER BY name ', ['serveur']);
        return res.json(result.rows);
    } catch (err) {
        console.log('GET /api/serveurs failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to load serveurs' });
    }
});

app.post('/api/serveurs', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const name = req && req.body ? String(req.body.name ?? '') : '';
    const password = req && req.body ? String(req.body.password ?? '') : '';
    if (!name || !isSixDigitNumeric(password)) {
        return res.status(400).json({ error: 'Invalid name or password' });
    }
     const verify = await client.query(
    'SELECT * FROM users WHERE password=$1',
    [password]
  );

  if (verify.rows.length > 0) {
    return res.status(400).json({ error: 'changer le mot passe     ' });
  }
    try {
        const result = await client.query(
            'INSERT INTO users(name, password,type) VALUES($1, $2,$3) RETURNING      name',
            [name, password,'serveur']
        );
        return res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('POST /api/serveurs failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to create serveur' });
    }
});

app.put('/api/serveurs/:id/password', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const id = String(req.params.id);
    const password = req && req.body ? String(req.body.password ?? '') : '';
    console.log(`Updating password for serveur id: ${id}`);
    console.log(typeof(id))
    console.log(`New password: ${password}`);
    console.log(typeof(password))
     const verify = await client.query(
    'SELECT 1 FROM users WHERE password=$1',
    [password]
  );

  if (verify.rows.length > 0) {
    return res.status(400).json({ error: 'changer le mot passe     ' });
  }
    try {
        const result = await client.query(
            'UPDATE users SET password = $1 WHERE name = $2 and type=$3',
            [password, id,'serveur']
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Serveur not found' });
        return res.json({ ok: true });
    } catch (err) {
        console.log('PUT /api/serveurs/:id/password failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to update serveur password' });
    }
});

app.delete('/api/serveurs/:id', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const id = String(req.params.id);
    if (!id) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    try {
        const result = await client.query('DELETE FROM users WHERE name = $1 and type=$2' , [id,'serveur']);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Serveur not found' });
        return res.json({ ok: true });
    } catch (err) {
        console.error('DELETE /api/serveurs/:id failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to delete serveur' });
    }
});

app.get('/api/categories', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    try {
        const result = await client.query('SELECT idcat FROM categorie ORDER BY idcat');
        return res.json(result.rows);
        
    } catch (err) {
        console.error('GET /api/categories failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to load categories' });
    }
});

app.post('/api/categories', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const idcat = req && req.body ? String(req.body.idcat ?? '') : '';
    if (!idcat) return res.status(400).json({ error: 'Missing idcat' });
    try {
        await client.query('INSERT INTO categorie(idcat) VALUES($1)', [idcat]);
        return res.status(201).json({ ok: true });
    } catch (err) {
        console.error('POST /api/categories failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to create categorie' });
    }
});

app.delete('/api/categories/:idcat', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const idcat = String(req.params.idcat ?? '');
    if (!idcat) return res.status(400).json({ error: 'Missing idcat' });
    try {
        const result = await client.query('DELETE FROM categorie WHERE idcat = $1', [idcat]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'categorie not found' });
        return res.json({ ok: true });
    } catch (err) {
        console.error('DELETE /api/categories/:idcat failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'le categorie qui vous voulez supprimer existe aujourd huit dans votre recu' });
    }
});

app.get('/api/tables', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    try {
        // return table id, lieu and type so client can group by lieu (location)
        const result = await client.query('SELECT id, lieu, type FROM tablee ORDER BY id');
        return res.json(result.rows);
    } catch (err) {
        console.error('GET /api/tables failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to load tables' });
    }
});

app.post('/api/tables', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const numtable = req && req.body ? Number(req.body.numtable) : NaN;
    const lieu = req && req.body ? String(req.body.lieu ?? '') : '';
    console.log('Creating table with numtable:', numtable, 'and lieu:', lieu);
    if (!Number.isFinite(numtable)) return res.status(400).json({ error: 'Invalid numtable' });
    try {
        await client.query('INSERT INTO tablee(id,lieu,type) VALUES($1,$2,$3)', [numtable, lieu,'libre']);
        return res.status(201).json({ ok: true });
    } catch (err) {
        console.error('POST /api/tables failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to create table' });
    }
});

app.delete('/api/tables/:numtable', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const numtable = Number(req.params.numtable);
    if (!Number.isFinite(numtable)) return res.status(400).json({ error: 'Invalid numtable' });
    try {
        const result = await client.query('DELETE FROM tablee WHERE id = $1', [numtable]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Table not found' });
        return res.json({ ok: true });
    } catch (err) {
        console.error('DELETE /api/tables/:numtable failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to delete table' });
    }
});

app.get('/api/products', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    try {
        const result = await client.query('SELECT idname, price, img, idcat FROM product ORDER BY idname');
        return res.json(result.rows);
    } catch (err) {
        console.error('GET /api/products failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to load products' });
    }
});

app.post('/api/products', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const idname = req && req.body ? String(req.body.idname ?? '') : '';
    const price = req && req.body ? Number(req.body.price) : NaN;
    const img = req && req.body ? String(req.body.img ?? '') : '';
    const idcat = req && req.body ? String(req.body.idcat ?? '') : '';
    if (!idname || !Number.isFinite(price) || !idcat) {
        return res.status(400).json({ error: 'Invalid product data' });
    }
    try {
        await client.query(
            'INSERT INTO product(idname, price, img, idcat) VALUES($1, $2, $3, $4)',
            [idname, price, img, idcat]
        );
        return res.status(201).json({ ok: true });
    } catch (err) {
        console.error('POST /api/products failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to create product' });
    }
});

app.put('/api/products/:idname/price', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const idname = String(req.params.idname ?? '');
    const price = req && req.body ? Number(req.body.price) : NaN;
    if (!idname || !Number.isFinite(price)) return res.status(400).json({ error: 'Invalid data' });
    try {
        const result = await client.query('UPDATE product SET price = $1 WHERE idname = $2', [price, idname]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
        return res.json({ ok: true });
    } catch (err) {
        console.error('PUT /api/products/:idname/price failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to update product price' });
    }
});

app.put('/api/products/:idname/name', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const idname = String(req.params.idname ?? '');
    const idnameNew = req && req.body ? String(req.body.idnameNew ?? '') : '';
    if (!idname || !idnameNew) return res.status(400).json({ error: 'Invalid data' });
    try {
        const result = await client.query('UPDATE product SET idname = $1 WHERE idname = $2', [idnameNew, idname]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
        return res.json({ ok: true });
    } catch (err) {
        console.error('PUT /api/products/:idname/name failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to update product name' });
    }
});

app.put('/api/products/:idname/img', async (req, res) => {
    console.log('Received request to update product image');
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const idname = String(req.params.idname ?? '');
    const img = req && req.body ? String(req.body.img ?? '') : '';
    if (!idname || !img) return res.status(400).json({ error: 'Invalid data' });
    try {
        const result = await client.query('UPDATE product SET img = $1 WHERE idname = $2', [img, idname]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
        return res.json({ ok: true });
    } catch (err) {
        console.error('PUT /api/products/:idname/img failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to update product image' });
    }
});

app.put('/api/products/:idname/categorie', async (req, res) => {
    console.log('Received request to update product categorie');
    console.log('Received request to update product categorie');
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const idname = String(req.params.idname ?? '');
    const idcat = req && req.body ? String(req.body.idcat ?? '') : '';
    if (!idname || !idcat) return res.status(400).json({ error: 'Invalid data' });
    try {
        const result = await client.query('UPDATE product SET idcat = $1 WHERE idname = $2', [idcat, idname]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
        return res.json({ ok: true });
    } catch (err) {
        console.error('PUT /api/products/:idname/categorie failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to update product categorie' });
    }
});

app.delete('/api/products/:idname', async (req, res) => {
    console.log('Received request to delete product');
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const idname = String(req.params.idname ?? '');
    if (!idname) return res.status(400).json({ error: 'Missing idname' });
    try {
        const result = await client.query('DELETE FROM product WHERE idname = $1', [idname]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
        return res.json({ ok: true });
    } catch (err) {
        console.error('DELETE /api/products/:idname failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'le produit qui vous voulez supprimer existe aujourd huit dans votre recu' });
    }
});

app.get('/api/totaledejour', async (req, res) => {

    if (!dbConnected) {
        return res.status(503).json({ error: 'Database not connected' });
    }
    try {
        const query = `
            SELECT 
                r.idrecu,
                r.id,
                r.totale,
                r.date,
                r.heurd,
                r.heurf,
                r.id,
                o.idname,
                p.price
            FROM recu r

            LEFT JOIN orderr o ON r.idrecu = o.idrecu
            LEFT JOIN product p ON o.idname = p.idname
                        where o.type = 'Accepted'
            ORDER BY r.date DESC, r.heurd DESC, r.idrecu, o.idname
        `;
        
        const result = await client.query(query);
        console.log('Daily Totals Data:', result.rows);
        return res.json({ data: result.rows });
    } catch (err) {
        console.error('GET /api/totaledejour failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to fetch daily totals' });
    }
});
app.get('/api/sum',async(req,res)=>{
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    try {

        const result = await client.query('select  sum(p.price) from orderr o join product p on o.idname = p.idname where o.type != $1;', ['Pending']);
        return res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }   
})

app.get('/api/recu-status', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    try {
        const result = await client.query(`
            SELECT idrecu, id AS numtable, COALESCE(type, 'pending') AS type
            FROM recu
            ORDER BY idrecu DESC
        `);
        return res.json(result.rows);
    } catch (err) {
        console.error('GET /api/recu-status failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to load recu status' });
    }
});

app.get('/api/recu-status/:idrecu/items', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const idrecu = Number(req.params.idrecu);
    if (!Number.isFinite(idrecu)) return res.status(400).json({ error: 'Invalid recu id' });

    try {
        const recuResult = await client.query(
            `SELECT idrecu, id AS numtable, type
            FROM recu
            WHERE idrecu = $1
            AND type = $2`,
            [idrecu, 'pending']
        );

        if (recuResult.rowCount === 0) {
            return res.status(404).json({ error: 'Pending recu not found' });
        }
        
        const itemsResult = await client.query(
            `SELECT o.ctid::text AS row_key, o.idname, p.price, o.optionn AS option, COALESCE(o.type, 'Pending') AS type
             FROM orderr o
             JOIN product p ON p.idname = o.idname
             WHERE o.idrecu = $1
               AND LOWER(COALESCE(o.type, 'Pending')) = $2
             ORDER BY o.idname`,
            [idrecu, 'pending']
        );
        return res.json({
            recu: recuResult.rows[0],
            items: itemsResult.rows,
        });
    } catch (err) {
        console.error('GET /api/recu-status/:idrecu/items failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to load pending recu items' });
    }
});

async function acceptRecuIfNoPendingItems(idrecu) {
    const counts = await client.query(
        `SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE LOWER(COALESCE(type, 'Pending')) = 'pending')::int AS pending
         FROM orderr
         WHERE idrecu = $1`,
        [idrecu]
    );

    const total = Number(counts.rows[0]?.total || 0);
    const pending = Number(counts.rows[0]?.pending || 0);
    console.log(`Recu ${idrecu} - Total items: ${total}, Pending items: ${pending}`);
    if( pending === 0) {
    if (total > 0 ) {
        const recuResult = await client.query(
            'SELECT totale FROM recu WHERE idrecu = $1',
            [idrecu]
        );
        console.log('Recu total:', recuResult.rows[0]?.totale);
        await client.query(
            'UPDATE recu SET type = $1 WHERE idrecu = $2',
            ['accepted', idrecu]
        );
        return true;
    }
    else if(total === 0){
        await client.query(
            'delete from recu where idrecu = $1',
            [idrecu]
        );
        return true;
    }
    }
    return false;
}

app.put('/api/recu-status/:idrecu', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const idrecu = Number(req.params.idrecu);
    const type = String(req.body?.type ?? '').trim().toLowerCase();
    const allowedTypes = new Set(['pending', 'accepted', 'served', 'refused']);

    if (!Number.isFinite(idrecu) || !allowedTypes.has(type)) {
        return res.status(400).json({ error: 'Invalid recu status' });
    }

    try {
        await client.query('BEGIN');

        const recuResult = await client.query(
            'SELECT id AS numtable FROM recu WHERE idrecu = $1',
            [idrecu]
        );

        if (recuResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Recu not found' });
        }

        const numtable = recuResult.rows[0].numtable;

        if (type === 'accepted') {
            await client.query(
                `UPDATE orderr
                 SET type = $1
                 WHERE idrecu = $2`,
                ['Accepted', idrecu]
            );

            await client.query(
                'UPDATE tablee SET type = $1, idrecu = $2 WHERE id = $3',
                ['occupied', idrecu, numtable]
            );
        }

        const result = await client.query(
            `UPDATE recu
             SET type = $1
             WHERE idrecu = $2
               AND EXISTS (SELECT 1 FROM orderr WHERE idrecu = $2)
             RETURNING idrecu, id AS numtable, type`,
            ['accepted', idrecu]
        );

        await client.query('COMMIT');

        if (result.rowCount === 0) {
            return res.status(400).json({ error: 'Cannot accept recu without order items' });
        }
        return res.json(result.rows[0]);
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('PUT /api/recu-status/:idrecu failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to update recu status' });
    }
});

app.put('/api/recu-status/:idrecu/items/:rowKey/accept', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const idrecu = Number(req.params.idrecu);
    const rowKey = String(req.params.rowKey ?? '');
    console.log(rowKey)
    if (!Number.isFinite(idrecu) || !rowKey) {
        return res.status(400).json({ error: 'Invalid order item' });
    }

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE orderr
             SET type = $1
             WHERE idrecu = $2 AND ctid = $3::tid
             RETURNING ctid::text AS row_key, idrecu, id AS numtable, idname, type`,
            ['Accepted', idrecu, rowKey]
        );

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Order item not found' });
        }
        console.log(result.rows[0].numtable);
        await client.query(
            'UPDATE tablee SET type = $1, idrecu = $2 WHERE id = $3',
            ['occupied', idrecu, result.rows[0].numtable]
        );
        console.log('Order item accepted, checking if recu can be accepted...');
        const recuAccepted = await acceptRecuIfNoPendingItems(idrecu);

        await client.query('COMMIT');
        return res.json({ ...result.rows[0], recuAccepted });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('PUT /api/recu-status/:idrecu/items/:rowKey/accept failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to accept order item' });
    }
});

app.delete('/api/recu-status/:idrecu/items/:rowKey', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const idrecu = Number(req.params.idrecu);
    const rowKey = String(req.params.rowKey ?? '');
    console.log('Received request to refuse order item with idrecu:', idrecu, 'and rowKey:', rowKey);
    if (!Number.isFinite(idrecu) || !rowKey) {
        return res.status(400).json({ error: 'Invalid order item' });
    }

    try {
        await client.query('BEGIN');
        console.log(rowKey)
        const result1 = await client.query(
            `UPDATE recu r
            SET totale = r.totale - p.price
            FROM orderr o
            JOIN product p ON p.idname = o.idname
            WHERE r.idrecu = o.idrecu
            AND o.idrecu = $1
            AND o.ctid = $2::tid;`,
            [idrecu, rowKey]
        );
        console.log('Updated recu total after refusing item, rows affected:', result1.rowCount);
         const result = await client.query(
            `DELETE FROM orderr
             WHERE idrecu = $1 AND ctid = $2::tid`,
            [idrecu, rowKey]
        );
        console.log('Deleted order item, rows affected:', result.rowCount);
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Order item not found' });
        }
        console.log('Order item refused, checking if recu can be accepted...');
        const recuAccepted = await acceptRecuIfNoPendingItems(idrecu);
         console.log('Order item refused, checking if recu can be accepted...');
        await client.query('COMMIT');
        return res.json({ ok: true, deleted: result.rows[0], recuAccepted });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('DELETE /api/recu-status/:idrecu/items/:rowKey failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to refuse order item' });
    }
});

app.get('/api/stat', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    try {
        const result = await client.query('SELECT date,time,totale FROM statistique ORDER BY date ASC');
        return res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

        // Close day: archive total to statistique and clear orders/receipts
app.post('/api/close-day', async (req, res) => {
  if (!dbConnected)
    return res.status(503).json({ error: 'Database not connected' });

  const totale = req && req.body ? Number(req.body.totale) : NaN;
  if (!Number.isFinite(totale))
    return res.status(400).json({ error: 'Invalid total' });

  try {
    await client.query('BEGIN');

    /* 1️⃣ إدخال statistiques اليومية par produit */
    await client.query(`
      INSERT INTO daily_stats (stat_date, idname, quantity)
      SELECT
        CURRENT_DATE,
        idname,              -- product_id
        COUNT(*)       -- total vendu
      FROM orderr
      where type = 'Accepted'
      GROUP BY idname
    `);

    console.log('Inserted daily product stats');

    /* 2️⃣ إدخال total النهار */
    await client.query(
      'INSERT INTO statistique(date, time, totale) VALUES (NOW(), CURRENT_TIME, $1)',
      [totale]
    );

    console.log('Inserted daily total into statistique:', totale);

    /* 3️⃣ تفريغ الطلبات و الفواتير */
    await client.query(
      'TRUNCATE TABLE orderr, recu RESTART IDENTITY CASCADE'
    );

    /* 4️⃣ Reset tables */
    await client.query(
      'UPDATE tablee SET type = $1, idrecu = NULL',
      ['libre']
    );

    await client.query('COMMIT');
    return res.json({ ok: true, message: 'Day closed, stats saved, orders reset' });

  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('POST /api/close-day failed:', err?.message || err);
    return res.status(500).json({ error: 'Failed to close day' });
  }
});
app.get("/api/stat/:date", async (req, res) => {
  const { date } = req.params;

  try {
    const result = await client.query(
      `SELECT stat_date, idname, quantity 
       FROM daily_stats 
       WHERE stat_date = $1
       order by quantity desc`
    ,
      [date]
    );

    res.json(result.rows); // 🔥 مهم برشا

  } catch (err) {
    console.log('GET /api/stat/:date failed:', err.message);
    res.status(500).json({ error: "server error" });
  }
});


// Create new receipt (recu)
app.post('/api/recu', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const numtable = req && req.body ? Number(req.body.numtable) : NaN;
    if (!Number.isFinite(numtable)) return res.status(400).json({ error: 'Invalid numtable' });
    
    try {
        const result = await client.query(
            'INSERT INTO recu(numtable, date, heurd) VALUES($1, CURRENT_DATE, CURRENT_TIME) RETURNING idrecu',
            [numtable]
        );
        return res.status(201).json({ idrecu: result.rows[0].idrecu });
    } catch (err) {
        console.error('POST /api/recu failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to create receipt' });
    }
});

// Update receipt end time
app.put('/api/recu/:numtable/endtime', async (req, res) => {

  if (!dbConnected) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  console.log("ahmed")
  const numtable = Number(req.params.numtable);
  console.log("numtable",numtable)

  try {
    // نجيب idrecu المفتوح متاع الطاولة
    const result = await client.query(
      'SELECT idrecu FROM recu WHERE heurf IS NULL AND id = $1',
      [numtable]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No open receipt for this table' });
    }
    
    const idrecu = result.rows[0].idrecu;

    await client.query(
      'UPDATE recu SET heurf = CURRENT_TIME ,type = $1 WHERE idrecu = $2',
      ['served', idrecu]
    );
    await client.query(
        'UPDATE tablee SET type = $1, idrecu = NULL WHERE id = $2',
        ['libre', numtable]
    );

    console.log("ismail")
    return res.json({ ok: true, idrecu });
  } catch (err) {
    console.error('PUT /api/recu/:numtable/endtime failed:', err);
    return res.status(500).json({ error: 'Failed to update receipt end time' });
  }
});


// Add order item to orderr table
app.post('/api/orderr', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const idrecu = req && req.body ? Number(req.body.idrecu) : NaN;
    const numtable = req && req.body ? Number(req.body.numtable) : NaN;
    const idname = req && req.body ? String(req.body.idname ?? '') : '';
    
    if (!Number.isFinite(idrecu) || !Number.isFinite(numtable) || !idname) {
        return res.status(400).json({ error: 'Invalid order data' });
    }
    
    try {
        // Resolve price if possible, so we can broadcast the item with price
        const prodRes = await client.query('SELECT price FROM product WHERE idname = $1 LIMIT 1', [idname]);
        const price = prodRes.rows && prodRes.rows[0] ? prodRes.rows[0].price : 0;

        await client.query(
            'INSERT INTO orderr(idrecu, id, idname) VALUES($1, $2, $3)',
            [idrecu, numtable, idname]
        );
        // Broadcast new order item to connected interfaces
        try {
            io.emit('new-order', { idrecu, numtable, idname, price });
        } catch (emitErr) {
            console.warn('Failed to emit socket event for new order:', emitErr);
        }
        return res.status(201).json({ ok: true });
    } catch (err) {
        console.error('POST /api/orderr failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to add order item' });
    }
    
});

// Update receipt total
app.put('/api/recu/:idrecu/total', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const idrecu = Number(req.params.idrecu);
    const totale = req && req.body ? Number(req.body.totale) : NaN;
    
    if (!Number.isFinite(idrecu) || !Number.isFinite(totale)) {
        return res.status(400).json({ error: 'Invalid idrecu or total' });
    }
    
    try {
        await client.query(
            'UPDATE recu SET totale = $1 WHERE idrecu = $2',
            [totale, idrecu]
        );
        return res.json({ ok: true });
    } catch (err) {
        console.error('PUT /api/recu/:idrecu/total failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to update receipt total' });
    }
});

// Get existing order for a table
app.get('/api/tablee/:id/order', async (req, res) => {
    console.log('Received request for table order:', req.params.id);
    
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const numtable = Number(req.params.id);
    console.log('Fetching order for table:', numtable);
    if (!Number.isFinite(numtable)) {
        return res.status(400).json({ error: 'Invalid table number' });
    }
    
try {
    // Get all active receipts for this table
    const recuResult = await client.query(
        'SELECT idrecu FROM recu WHERE id = $1 AND heurf IS NULL',
        [numtable]
    );

    if (recuResult.rows.length === 0) {
        return res.json(null); // No active order for this table
    }

    let allItems = [];

    // Loop over each active receipt
    for (const recu of recuResult.rows) {
        const orderResult = await client.query(
            'SELECT o.idname, p.price FROM orderr o JOIN product p ON o.idname = p.idname WHERE o.idrecu = $1 and o.type != $2',
            [recu.idrecu, 'Pending']
        );

        // Push all items from this receipt
        allItems.push(...orderResult.rows.map(row => ({
            name: row.idname,
            price: row.price
        })));
    }

    return res.json({
        items: allItems
    });
} catch (err) {
    console.error('GET /api/tablee/:id/order failed:', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Failed to fetch table order' });
}

});
app.get('/gerant', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    try {
        const result = await client.query('SELECT date, totale FROM statistique ORDER BY date ASC');
        return res.json(result.rows);
    } catch (err) {
        console.error('GET /gerant failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to fetch statistique' });
    }
});

app.get('/statistique', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    try {
        const result = await client.query('SELECT date, totale FROM statistique ORDER BY date ');
        return res.json(result.rows);
    } catch (err) {
        console.error('GET /statistique failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to fetch statistique' });
    }
});

// Get occupied tables
app.get('/api/tables/occupied', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    try {
        const result = await client.query("SELECT id FROM tablee WHERE LOWER(type) = 'occupied' ORDER BY id");
        return res.json(result.rows);
    } catch (err) {
        console.error('GET /api/tables/occupied failed:', err && err.message ? err.message : err);
        return res.status(500).json({ error: 'Failed to load occupied tables' });
    }
});
// Change table endpoint: move latest active receipt + its orders from oldTable -> newTable and update table statuses
app.post('/api/change-table', async (req, res) => {
    if (!dbConnected) return res.status(503).json({ error: 'Database not connected' });
    const oldTable = Number(req.body.oldTable);
    console.log('OLD TABLE:', oldTable);
    const newTable = Number(req.body.newTable);
    if (!Number.isFinite(oldTable) || !Number.isFinite(newTable) || oldTable <= 0 || newTable <= 0) {
        return res.status(400).json({ error: 'Invalid table numbers' });
    }
    try {
        await client.query('BEGIN');
        // mark old table libre and new table occupied
    
        await client.query('UPDATE tablee SET type = $1 , idrecu=null WHERE id = $2', ['libre', oldTable]);
        await client.query('UPDATE tablee SET type = $1 WHERE id = $2', ['occupied', newTable]);
        console.log('Table num', oldTable, 'marked libre, table num', newTable, 'marked isOccupied');
        
        const karizma = await client.query(
            'SELECT idrecu FROM recu WHERE id = $1 AND heurf IS NULL',
            [newTable]
        );
    
        if (karizma.rowCount === 0) {
            console.log('no active recu found for new table');
            
            const result = await client.query(
                'SELECT idrecu FROM recu WHERE id = $1 AND heurf IS NULL ORDER BY idrecu LIMIT 1',
                [oldTable]
            );
            
            // Check if a row exists before accessing
            if (!result.rows || result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, error: 'No active receipt found for old table' });
            }
            
            const idrecuz = result.rows[0].idrecu;
            await client.query('UPDATE tablee SET idrecu = $1 WHERE id = $2', [idrecuz, newTable]);
            await client.query(
                'UPDATE recu SET id = $1 WHERE idrecu = $2 AND heurf IS NULL',
                [newTable, idrecuz]
            );
            await client.query(
                'UPDATE orderr SET id = $1 WHERE idrecu = $2',
                [newTable, idrecuz]
            );    
            console.log('Moved recu id', idrecuz, 'from table', oldTable, 'to table', newTable);
            await client.query('COMMIT');
            return res.json({ success: true, message: 'Receipt moved to new table' });
        }
        else {
            // Get the active receipt from the new table
            const oldRecuId = karizma.rows[0].idrecu;
            
            // Get the active receipt from the old table
            const resold = await client.query(
                'SELECT idrecu FROM recu WHERE id = $1 AND heurf IS NULL',
                [oldTable]
            );
            
            // Check if a row exists before accessing
            if (!resold.rows || resold.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, error: 'No active receipt found for old table' });
            }
            
            const newRecuId = resold.rows[0].idrecu;
            console.log('Merging recu id', oldRecuId, 'into recu id', newRecuId);

            // 1️⃣ Merge totale from old receipt into new receipt
            console.log('new tabell rahy', newTable);
            console.log('old recu id', oldRecuId, 'new recu id', newRecuId);
            await client.query(
                `UPDATE recu
                 SET totale = totale + (
                     SELECT COALESCE(totale, 0) FROM recu WHERE idrecu = $1
                 ),id=$2
                 WHERE idrecu = $3`,
                [oldRecuId, newTable, newRecuId]
            );

            // 2️⃣ Move orders to new receipt
            console.log('Moving orders from table', oldTable, 'to table', newTable);
            await client.query(
                'UPDATE orderr SET idrecu = $1, id = $2 WHERE idrecu = $3',
                [newRecuId, newTable, oldRecuId]
            );

            // 3️⃣ Delete old receipt
            await client.query(
                'DELETE FROM recu WHERE idrecu = $1',
                [oldRecuId]
            );

            await client.query('COMMIT');
            return res.json({ success: true, message: 'Receipts merged successfully' });
        }
    
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('POST /api/change-table failed:', err && err.message ? err.message : err);
        return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
    }
});
app.post('/sortie-auto', async function (req, res) {
    console.log('Received /sortie-auto request with body:', req.body);
    const { numtable, time } = req.body || {};
    if (!numtable) return res.status(400).json({ success: false, error: 'MISSING_TABLE' });
    const heurf = time || (new Date()).toTimeString().slice(0,8);
    console.log('Processing /sortie-auto for table:', numtable, 'with time:', heurf);
    try {
        await client.query('BEGIN');
        // mark table free (type = 'ibre')
        await client.query('UPDATE tablee SET type = $1,idrecu = null WHERE id = $2 '  , ['libre', numtable]);
        // update recu.heurf for that table id
        await client.query('UPDATE recu SET heurf = $1 WHERE id = $2', [heurf, numtable]);
        await client.query('COMMIT');
        return res.json({ success: true });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('Error in /sortie-auto', err && err.message ? err.message : err);
        return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
    }
});
app.post('/demander', async function demander(req, res) {
    console.log('Received /demander request with body:', req.body);
    
    const payload = req.body || {};
    const numtable = payload.numtable;
    const items = Array.isArray(payload.itemss) ? payload.itemss : [];
    const totale = payload.totale;

    if (!items.length) {
        return res.status(400).json({ success: false, error: 'EMPTY_CART' });
    }
    if (totale === undefined || totale === null || Number.isNaN(Number(totale))) {
        return res.status(400).json({ success: false, error: 'INVALID_TOTAL' });
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);

    let idrecu;

    try {
        await client.query('BEGIN');

        const verifyTable = await client.query(
            'SELECT idrecu FROM recu WHERE id=$1 AND heurf IS NULL',
            [numtable]
        );

        if (verifyTable.rowCount === 0) {
            const recuInsert = await client.query(
                'INSERT INTO recu (id, totale, date, heurd, heurf,type) VALUES ($1,$2,$3,$4,$5,$6) RETURNING idrecu',
                [numtable, Number(totale), dateStr, timeStr, null, 'accepted']
            );
            idrecu = recuInsert.rows[0].idrecu;

            await client.query(
                'UPDATE tablee SET type=$1, idrecu=$2 WHERE id=$3',
                ['occupied', idrecu, numtable]
            );
        } else {
            idrecu = verifyTable.rows[0].idrecu;
        }
        console.log('Using idrecu:', idrecu);

        for (const item of items) {
            await client.query(
                'INSERT INTO orderr (idrecu, id, idname, optionn,type) VALUES ($1,$2,$3,$4,$5)',
                [idrecu, numtable, String(item.name), null, 'Accepted']
            );
        }
        console.log('orderr items inserted for idrecu:', idrecu);

        await client.query('COMMIT');


        return res.json({ success: true, idrecu });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('api/demander error:', err && err.message ? err.message : err);
        return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
    }
});
app.get('/api/cercle-stats/:date', async (req, res) => {
    const { date } = req.params;
    console.log('Date:', date);

    if (!dbConnected) {
        return res.status(503).json({ error: 'Database not connected' });
    }

    try {
        const result = await client.query(`
SELECT c.idcat, SUM(d.quantity) AS total
FROM daily_stats d
JOIN product p ON d.idname = p.idname
JOIN categorie c ON p.idcat = c.idcat
WHERE d.stat_date = $1
GROUP BY c.idcat
ORDER BY total DESC;
        `, [date]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'cercle stats error' });
    }
});
