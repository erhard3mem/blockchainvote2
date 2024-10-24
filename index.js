const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();
//const Cookies = require('js-cookie');


app.use(bodyParser.json());

const cors = require('cors');

// Enable CORS with the specified origin
app.use(cors());

let peers = []; // List of peer URLs

// Block class
class Block {
    constructor(index, timestamp, data, previousHash = "") {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.hash = this.calculateHash();
        this.nonce = 0; // Added nonce for proof of work
    }

    calculateHash() {
        return require("crypto")
            .createHash("sha256")
            .update(
                    this.index +
                    this.timestamp +
                    this.previousHash +
                    JSON.stringify(this.data) +
                    this.nonce
            )
            .digest("hex");
    }

    mineBlock(difficulty) {
        while (
            this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")
        ) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
    }
}

// Blockchain class
class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2; // Adjustable mining difficulty
    }

    createGenesisBlock() {
        return new Block(0, Date.now(), "Genesis Block", "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addBlock(newBlock) {
        newBlock.previousHash = this.getLatestBlock().hash;
        newBlock.mineBlock(this.difficulty);
        this.chain.push(newBlock);
    }

    isValidChain(chain) {
        for (let i = 1; i < chain.length; i++) {
            const currentBlock = chain[i];
            const previousBlock = chain[i - 1];

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }
        }
        return true;
    }
}

const blockchain = new Blockchain(); // Create the blockchain


function mineBlock(data) {
  const newBlockData = data;
  const newBlock = new Block(
      blockchain.chain.length,
      Date.now(),
      newBlockData
  );
  blockchain.addBlock(newBlock);


  db_bc.run("DELETE FROM bc", (err) => {
    if (err) {
      console.error(err.message);
    }else {
      console.log('delete from BC successful');
    }
  });

  for(let b = 0; b < blockchain.chain.length; b++) {
    let el = blockchain.chain[b]
    db_bc.run("INSERT INTO bc (el) VALUES (?)", [JSON.stringify(el)], (err) => { 
      if (err) {
        console.error(err.message);
      }else {
        console.log('insert into BC successful');
      }
    });
  }
}

/*********************************************LOGIN********************************************/

//const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'bl0ckchainv0te'

// think about: is this a good idea?
const db_bc = new sqlite3.Database('/var/data/bc.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to SQLite database (bc).');

  // Create users table if it doesn't exist
  db_bc.run(`CREATE TABLE IF NOT EXISTS bc (
    id INTEGER PRIMARY KEY AUTOINCREMENT,    
    el TEXT NOT NULL
  )`, (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log("db_bc.run() without error")
      initBlockchainFromDB();
    }
  });

});

const db_user = new sqlite3.Database('/var/data/user.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to SQLite database (user).');

  // Create users table if it doesn't exist
  db_user.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL
  )`, (err) => {
    if (err) {
      console.error(err.message);
    }
  });
});

// Database connection
const db = new sqlite3.Database('/var/data/main.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to SQLite database (main).');
 
  db.run(`CREATE TABLE IF NOT EXISTS options (
      option_id INTEGER PRIMARY KEY AUTOINCREMENT,    -- Unique ID for each candidate
      voting_id INTEGER NOT NULL, 
      name TEXT NOT NULL,                             -- Name of the candidate or option
      description TEXT,                               -- Description of the candidate or option
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,   -- Timestamp when candidate was added
      FOREIGN KEY (voting_id) REFERENCES votings(voting_id) ON DELETE CASCADE -- Delete votes if candidate is deleted    
  )`, (err) => {
    if (err) {
      console.error(err.message);
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS votings (
      voting_id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Unique ID for each election
      title TEXT NOT NULL,                            -- Title of the election
      description TEXT,                               -- Description of the election
      start_date DATETIME NOT NULL,                   -- Start date of the election
      end_date DATETIME NOT NULL,                     -- End date of the election
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- Timestamp when election was created
  )`, (err) => {
    if (err) {
      console.error(err.message);
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS votes (
    vote_id INTEGER PRIMARY KEY AUTOINCREMENT,      -- Unique ID for each election
    user_id INTEGER NOT NULL,                       -- Foreign key referring to Users
    voting_id INTEGER NOT NULL,                     -- Foreign key referring to Users
    --FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,   -- Delete votes if user is deleted
    FOREIGN KEY (voting_id) REFERENCES votings(voting_id) ON DELETE CASCADE, -- Delete votes if candidate is deleted    
    UNIQUE(user_id, voting_id)                      -- Ensure one vote per user per election
)`, (err) => {
  if (err) {
    console.error(err.message);
  }
});

// on start of index.js: delete all votes
/*db.run(`DELETE FROM votes;`, (err) => {
if (err) {
  console.error(err.message);
}
});*/
 
 
});

/***********************************************************************************************/
function initBlockchainFromDB(){
  console.log("initBlockchainFromDB()");
  
  try {
      (new Promise((resolve, reject) => {
      db_bc.all('SELECT * FROM bc ORDER BY id', (err, rows) => {
        if (err) {
          reject(err);  // Handle the error
        } else {
          resolve(rows);  // All rows are returned in an array
        }
      });
    }).then(data => {
      if(data.length>0) {
        blockchain.chain = []
        console.log("initBlockchainFromDB data = ",data)
        for(let i = data.length-1; i >= 0; i--) {
          let chainEl = JSON.parse(data[i].el)        
          blockchain.chain.push(chainEl);        
        }
      }
    }));
  } catch(err) {
    console.log(err)
  }
}

// TODO: think about mechanism for 'saving' the blockchain in SQlite to survive restart of server
//initBlockchainFromDB();
/***********************************************************************************************/

// Middleware
app.use(express.urlencoded({ extended: true }));

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await new Promise((resolve, reject) => {
      db_user.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (!user) {
      console.log('invalid username')
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        console.log('invalid password')
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate a JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: '1h'
    });

    // Send the token to the frontend
    res.json({ token });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Register user route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    console.log("register request...")
  
    try {
      // Check if username already exists
      const existingUser = await   
   new Promise((resolve, reject) => {
      db_user.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });

      console.log(JSON.stringify(existingUser))
  
      if (existingUser)
        {
            console.log("existing user")
        return res.status(400).json({ error: 'Username already exists' });
      }
  
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10); 

      // Insert new user into database
      db_user.run('INSERT INTO users (username, passwordHash) VALUES (?, ?)', [username, hashedPassword], (err) => {
        if (err) {
          console.error('Registration error:', err);
          res.status(500).json({ error: 'Server error' });
        } else {
          res.json({ message: 'Registration successful' });
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });


// Middleware to protect routes
const authenticateToken = (req, res, next) => {
  console.log('authenticate token...');

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
  });
};

app.get('/profile', authenticateToken, (req, res) => {
  res.json({ userId: req.user.userId });
});

/*******************************************************************************/

// Create voting
app.post('/createVoting', authenticateToken, async (req, res) => {
  const { title, description } = req.body;

  try { 
    db.run("INSERT INTO votings (title, description, start_date, end_date) VALUES (?, ?, datetime('now'), datetime('now', '+24 hours'))", [title, description], (err) => {
      if (err) {
        console.error('/createVoting error:', err);
        res.status(500).json({ error: 'Server error' });
      } else {
        res.json({ message: 'createVoting successful' });
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get votings
app.get('/getVotings', authenticateToken, async (req, res) => {
  try { 

    (new Promise((resolve, reject) => {
      db.all('SELECT * FROM votings', (err, rows) => {
        if (err) {
          reject(err);  // Handle the error
        } else {
          resolve(rows);  // All rows are returned in an array
        }
      });
    }).then(data => {
      res.json( data )
    }));
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


app.post('/createOption', authenticateToken, async (req, res) => {
  const { name, description, votingId } = req.body;

  console.log("/createOption: votingId=",votingId)

  try { 
    db.run("INSERT INTO options (name, description, voting_id) VALUES (?, ?, ?)", [name, description, votingId], (err) => {
      if (err) {
        console.error('/createOption error:', err);
        res.status(500).json({ error: 'Server error' });
      } else {
        res.json({ message: 'createOption successful' });
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/getOptions', authenticateToken, async (req, res) => {
  try {
    const { votingId } = req.body;

    // Await the promise here
    const data = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM options WHERE voting_id = ?', [votingId], (err, rows) => {
        if (err) {
          reject(err);  // Reject the promise if there's an error
        } else {
          resolve(rows);  // Resolve the promise with the result
        }
      });
    });

    // After awaiting the data, log and send the response
    //console.log("/getOptions: data = ", data);
    res.json(data);  // Send the result back as JSON

  } catch (error) {
    console.error('Error in /getOptions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/getOptionName', authenticateToken, async (req, res) => {
  try {
    const { oId } = req.body;

    // Await the promise here
    const data = await new Promise((resolve, reject) => {
      db.get('SELECT name FROM options WHERE option_id = ?', [oId], (err, row) => {
        if (err) {
          reject(err);  // Reject the promise if there's an error
        } else {
          resolve(row);  // Resolve the promise with the result
        }
      });
    });
    //console.log("/getOptionName data="+data)
    res.json(data);  // Send the result back as JSON

  } catch (error) {
    console.error('Error in /getOption:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


app.post('/vote', authenticateToken, async (req, res) => {
  const { userId, votingId } = req.body;

  try { 
    db.run("INSERT INTO votes (user_id, voting_id) VALUES (?, ?)", [userId, votingId], (err) => {
      if (err) {
        console.error('/vote error:', err);
        res.status(500).json({ error: 'Server error' });
      } else {
        res.json({ message: 'vote successful' });
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

let updateTimestamp = 0;

app.get("/syncTimestamp", (req, res) => {
  res.send({ ts: updateTimestamp });
});

// Route to mine a new block
app.post("/mineBlock", (req, res) => {
  const newBlockData = req.body.data;
  mineBlock(newBlockData);
  updateTimestamp = (new Date()).getTime();
});

// Route to get the blockchain
app.get("/bc", (req, res) => {
  console.log('/bc called');
  
  res.send({ chain: blockchain.chain, difficulty: blockchain.difficulty });
});

/*******************************************************************************************/

// Generate a random number between min (inclusive) and max (exclusive)
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
  
let port = 3000;
/*
if (process.argv[2]) {
    port = Number(process.argv[2])
} else {
    port = getRandomInt(3000, 3999);
}*/

// Start the server on a given port
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})

// Set up EJS as the template engine
app.set('view engine', 'ejs');

// Route to render the HTML page
app.get('/', (req, res) => {
    res.render('index', { port: port });
});



