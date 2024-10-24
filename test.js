const express = require("express");
const bodyParser = require("body-parser");
const app = express();

    app.use(bodyParser.urlencoded({ extended: true }));


const sqlite3 = require('sqlite3').verbose();

// think about: is this a good idea?
const db = new sqlite3.Database('test.db', (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to SQLite database (test).');
  
    // Create users table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS test (
      id INTEGER PRIMARY KEY AUTOINCREMENT,    
      el TEXT NOT NULL
    )`, (err) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log("db.run() without error")
        
      }
    });
  
  });
  
  
  let port = 3000;
  /*
  if (process.argv[2]) {
      port = Number(process.argv[2])
  } else {
      port = getRandomInt(3000, 3999);
  }*/
  
 
  

  // Route to render the HTML page
  app.get('/get', (req, res) => {
    try { 

        (new Promise((resolve, reject) => {
          db.all('SELECT * FROM test', (err, rows) => {
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
        console.error('/ error:', error);
        res.status(500).json({ error: 'Server error' });
      }
  });

  app.post('/test', (req, res) => {

    const { text } = req.body;

    console.log(text)
       
    try { 
      db.run("INSERT INTO test (el) VALUES (?)", [text], (err) => {
        if (err) {
          console.error('/test error:', err);
          res.status(500).json({ error: 'Server error' });
        } else {
          res.json({ message: 'create test successful' });
        }
      });
    } catch (error) {
      console.error('/test error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  
  
   // Start the server on a given port
   app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})

// Set up EJS as the template engine
app.set('view engine', 'ejs');

// Route to render the HTML page
app.get('/', (req, res) => {
  res.render('test', { port: port });
});
