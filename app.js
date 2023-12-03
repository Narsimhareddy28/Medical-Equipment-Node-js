const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');
const app = express();
const port = 3000;

// Generate a random secret key
const generateRandomKey = () => {
    return crypto.randomBytes(32).toString('hex');
  };
  
app.use(session({
    secret: generateRandomKey(), // Replace with a strong secret key
    resave: false,
    saveUninitialized: true
  }));

// MySQL connection configuration
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Saireddy@28',
  database: 'medical',
});

// Connect to MySQL
db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

// Middleware for parsing JSON and form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (CSS, images, etc.) from the "public" directory
app.use(express.static('public'));

// Set the view engine to ejs
app.set('view engine', 'ejs');

// Registration page
app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/register', (req, res) => {
    res.render('register');
  });
  
  app.post('/register', (req, res) => {
    const { name, address, telephone_number, username, password } = req.body;
  
    const sql = 'INSERT INTO clients (name, address, telephone_number, username, password) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [name, address, telephone_number, username, password], (err, result) => {
      if (err) throw err;
      console.log('User registered successfully');
      res.redirect('/login');
    });
  });
  
  // Login page
  app.get('/login', (req, res) => {
    res.render('login');
  });
  
//   app.post('/login', (req, res) => {
//     const { username, password } = req.body;
  
//     // Validate the username and password (add your validation logic here)
  
//     // Query the database to get the client_id
//     const sql = 'SELECT client_id FROM clients WHERE username = ? AND password = ?';
//     db.query(sql, [username, password], (err, result) => {
//       if (err) {
//         console.error('Error querying the database:', err);
//         throw err;
//       }
  
//       if (result.length > 0) {
//         // Store client_id in the session
//         req.session.client_id = result[0].client_id;
  
//         // Redirect to the dashboard or any other page
//         res.redirect('/dashboard');
//       } else {
//         // Handle invalid login credentials
//         res.send('Invalid login credentials');
//       }
//     });
//   });


  app.post('/login', (req, res) => {
    const { username, password, role } = req.body;

    // Validate the username and password (add your validation logic here)

    // Determine the table to query based on the role
    const tableName = (role === 'manager') ? 'managers' : 'clients';
    let sql;

    // Query the database to get the user_id
    if (role === 'manager') {
         sql = `SELECT manager_id FROM ${tableName} WHERE username = ? AND password = ?`;
    } else {
         sql = `SELECT client_id FROM ${tableName} WHERE username = ? AND password = ?`;
    }
    db.query(sql, [username, password], (err, result) => {
        if (err) {
            console.error('Error querying the database:', err);
            throw err;
        }

        if (result.length > 0) {
            // Set user_id in the session based on the role
            if (role === 'manager') {
                req.session.manager_id = result[0].manager_id;
            } else {
                req.session.client_id = result[0].client_id;
            }
            // Redirect to the appropriate dashboard based on the role
            if (role === 'manager') {
                res.redirect('/manager-dashboard');
            } else {
                res.redirect('/dashboard');
            }
        } else {
            // Handle invalid login credentials
            res.send('Invalid login credentials');
        }
    });
});


  
  // Dashboard page (authenticated route)
// ...

// Dashboard page (authenticated route)
// Dashboard page (authenticated route)
app.get('/dashboard', (req, res) => {
    const client_id = req.session.client_id;

    // Fetch available equipment
    const sql = 'SELECT * FROM medical_equipment WHERE quantity_in_store > 0';
    db.query(sql, (err, equipment) => {
      if (err) {
        console.error('Error fetching equipment:', err);
        throw err;
      }

      const sql = 'SELECT * FROM medical_equipment WHERE quantity_in_store = 0';
      db.query(sql, (err, equipment2) => {
        if (err) {
          console.error('Error fetching equipment:', err);
          throw err;
        }
        // Fetch client's order history
        const orderSql = 'SELECT o.*, e.name AS equipment_name FROM orders o JOIN medical_equipment e ON o.equipment_id = e.equipment_id WHERE client_id = ?';
        db.query(orderSql, [client_id], (err, orders) => {
            if (err) {
                console.error('Error fetching order history:', err);
                throw err;
            }

            console.log('Order history:', orders);

            // Render the dashboard with equipment and order history
            res.render('dashboard', { equipment, orders ,equipment2});
        });
    });
});
});
  
  
  // ...
// Handle equipment rental
// Handle equipment rental form submission
app.post('/rent', (req, res) => {
    const { client_id } = req.session; // Assuming you have stored the client_id in the session upon login
    const { equipment_id, quantity, start_date, end_date, amount_paid } = req.body;

    // Fetch equipment details
    const equipmentSql = 'SELECT name, rent_price_per_day, quantity_in_store FROM medical_equipment WHERE equipment_id = ?';
    db.query(equipmentSql, [equipment_id], (err, equipmentResult) => {
        if (err) {
            console.error('Error fetching equipment details:', err);
            throw err;
        }

        const { name, rent_price_per_day, quantity_in_store } = equipmentResult[0];

        // Calculate total amount
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        const numberOfDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const totalAmount = quantity * rent_price_per_day * numberOfDays;
        const payment_date = new Date();

        // Insert order details into the orders table
        const orderSql = 'INSERT INTO orders (client_id, equipment_id, start_date, end_date, quantity, total_price, amount_paid, payment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(orderSql, [client_id, equipment_id, start_date, end_date, quantity, totalAmount, amount_paid, payment_date], (err, result) => {
            if (err) {
                console.error('Error inserting order:', err);
                throw err;
            }

            // Update quantity_in_store in medical_equipment table
            const updatedQuantity = quantity_in_store - quantity;
            const updateQuantitySql = 'UPDATE medical_equipment SET quantity_in_store = ? WHERE equipment_id = ?';
            db.query(updateQuantitySql, [updatedQuantity, equipment_id], (err) => {
                if (err) {
                    console.error('Error updating quantity:', err);
                    throw err;
                }

                console.log('Equipment rented successfully');
                res.redirect(`/receipt/${result.insertId}`);
            });
        });
    });
});
  
//receipt 
// Receipt page
app.post('/receipt/:order_id', (req, res) => {
    const order_id = req.params.order_id;

    // Fetch order details
    const orderSql = `
        SELECT 
            o.*, 
            c.name AS client_name, 
            c.address AS client_address, 
            c.telephone_number AS client_telephone, 
            e.name AS equipment_name, 
            e.description AS equipment_description, 
            e.manufacturer AS equipment_manufacturer
        FROM orders o
        JOIN clients c ON o.client_id = c.client_id
        JOIN medical_equipment e ON o.equipment_id = e.equipment_id
        WHERE order_id = ?
    `;
    db.query(orderSql, [order_id], (err, orderDetails) => {
        if (err) {
            console.error('Error fetching order details:', err);
            throw err;
        }


        // Render the receipt with order details
        res.render('receipt', { orderDetails });
    });
});
app.get('/receipt/:order_id', (req, res) => {
    const order_id = req.params.order_id;

    // Fetch order details
    const orderSql = `
        SELECT 
            o.*, 
            c.name AS client_name, 
            c.address AS client_address, 
            c.telephone_number AS client_telephone, 
            e.name AS equipment_name, 
            e.description AS equipment_description, 
            e.manufacturer AS equipment_manufacturer
        FROM orders o
        JOIN clients c ON o.client_id = c.client_id
        JOIN medical_equipment e ON o.equipment_id = e.equipment_id
        WHERE order_id = ?
    `;
    db.query(orderSql, [order_id], (err, orderDetails) => {
        if (err) {
            console.error('Error fetching order details:', err);
            throw err;
        }


        // Render the receipt with order details
        res.render('receipt', { orderDetails });
    });
});


// Logout route
app.post('/logout', (req, res) => {
    // Destroy the session to log the user out
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        res.status(500).send('Internal Server Error');
      } else {
        // Redirect the user to the login page after logout
        res.redirect('/login');
      }
    });
  });




//managet

// Manager Dashboard route
app.get('/manager-dashboard', (req, res) => {
    // Fetch equipment data
    const sql = 'SELECT * FROM medical_equipment';
    db.query(sql, (err, equipment) => {
      if (err) {
        console.error('Error fetching equipment:', err);
        throw err;
      }

      const clientsSql = 'SELECT * FROM clients';
      db.query(clientsSql, (err, clients) => {
        if (err) {
          console.error('Error fetching clients:', err);
          throw err;
        }
  
      // Render the manager dashboard view with equipment data
      res.render('manager-dash', { equipment,clients });
    });
  });
});


// Handle equipment update form submission
app.post('/update-equipment', (req, res) => {
    const { equipment_id, rent_price_per_day, quantity_in_store } = req.body;
  
    // Update equipment details in the database
    const updateSql = 'UPDATE medical_equipment SET rent_price_per_day = ?, quantity_in_store = ? WHERE equipment_id = ?';
    db.query(updateSql, [rent_price_per_day, quantity_in_store, equipment_id], (err, result) => {
      if (err) {
        console.error('Error updating equipment:', err);
        throw err;
      }
  
      console.log('Equipment updated successfully');
      res.redirect('/manager-dashboard'); // Redirect back to the manager dashboard
    });
  });
  
// Handle add equipment form submission
app.post('/add-equipment', (req, res) => {
    const { name, manufacturer, description, rent_price_per_day, quantity_in_store, supplier_id } = req.body;
  
    // Insert new equipment into the database
    const addEquipmentSql = `
      INSERT INTO medical_equipment (name, manufacturer, description, rent_price_per_day, quantity_in_store, supplier_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.query(addEquipmentSql, [name, manufacturer, description, rent_price_per_day, quantity_in_store, supplier_id], (err, result) => {
      if (err) {
        console.error('Error adding equipment:', err);
        throw err;
      }
  
      console.log('Equipment added successfully');
      // Redirect back to the manager dashboard after adding equipment
      res.redirect('/manager-dashboard');
    });
  });
  
//take order

// Handle the "Take Order" form submission
app.post('/take-order', (req, res) => {
    const { client_id, equipment_id, quantity, start_date, end_date, total_amount, amount_paid } = req.body;
  
    const equipmentSql = 'SELECT name, rent_price_per_day, quantity_in_store FROM medical_equipment WHERE equipment_id = ?';
    db.query(equipmentSql, [equipment_id], (err, equipmentResult) => {
      if (err) {
        console.error('Error fetching equipment details:', err);
        throw err;
      }
  
      const { name, rent_price_per_day, quantity_in_store } = equipmentResult[0];



    // Insert order details into the orders table
    const orderSql = 'INSERT INTO orders (client_id, equipment_id, start_date, end_date, quantity, total_price, amount_paid, payment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const payment_date = new Date();
    db.query(orderSql, [client_id, equipment_id, start_date, end_date, quantity, total_amount, amount_paid, payment_date], (err, result) => {
      if (err) {
        console.error('Error inserting order:', err);
        throw err;
      }

      const updatedQuantity = quantity_in_store - quantity;
      const updateQuantitySql = 'UPDATE medical_equipment SET quantity_in_store = ? WHERE equipment_id = ?';
      db.query(updateQuantitySql, [updatedQuantity, equipment_id], (err) => {
          if (err) {
              console.error('Error updating quantity:', err);
              throw err;
          }

  
      console.log('Order submitted successfully');
      res.redirect('/manager-dashboard');
    });
  });
});
});


// Route to display a list of all customers
app.get('/customer-list', (req, res) => {
    // Fetch all customers
    const customersSql = 'SELECT * FROM clients';
  
    db.query(customersSql, (err, customers) => {
      if (err) {
        console.error('Error fetching customers:', err);
        throw err;
      }
  
      res.render('customer-list', { customers });
    });
  });
  
  // Route to display a report for a specific customer
// Route to display a report for a specific customer
app.get('/customer-report/:client_id', (req, res) => {
  const client_id = req.params.client_id;

  // Fetch customer details
  const customerSql = 'SELECT * FROM clients WHERE client_id = ?';
  db.query(customerSql, [client_id], (err, customer) => {
    if (err) {
      console.error('Error fetching customer details:', err);
      throw err;
    }

    // Fetch equipment rented by the specified client
    const equipmentSql = `
      SELECT 
        e.*, 
        o.start_date,
        o.end_date,
        o.quantity,
        o.total_price
      FROM medical_equipment e
      JOIN orders o ON e.equipment_id = o.equipment_id
      WHERE o.client_id = ?
    `;

    db.query(equipmentSql, [client_id], (err, equipment) => {
      if (err) {
        console.error('Error fetching customer equipment:', err);
        throw err;
      }

      res.render('customer-report', { customer: customer[0], equipment });
    });
  });
});
// Route to display a report of payments for all clients
// Route to display a report of payments for all clients
// Route to display a report of payments for all clients
app.get('/payment-report', (req, res) => {
  // Fetch payments made by all clients
  const paymentsSql = `
    SELECT 
      o.order_id,
      c.name AS client_name,
      e.equipment_id,
      e.name AS equipment_name,
      o.amount_paid,
      o.payment_date
    FROM orders o
    JOIN clients c ON o.client_id = c.client_id
    JOIN medical_equipment e ON o.equipment_id = e.equipment_id
  `;

  db.query(paymentsSql, (err, payments) => {
    if (err) {
      console.error('Error fetching payments:', err);
      throw err;
    }

    res.render('payment-report', { payments });
  });
});

// Route to display a report of pending payments
app.get('/pending-payment-report', (req, res) => {
  // Fetch orders with pending payments
  const pendingPaymentsSql = `
    SELECT 
      o.order_id,
      c.name AS client_name,
      e.equipment_id,
      e.name AS equipment_name,
      o.total_price,
      o.amount_paid,
      (o.total_price - o.amount_paid) AS pending_amount,
      o.payment_date
    FROM orders o
    JOIN clients c ON o.client_id = c.client_id
    JOIN medical_equipment e ON o.equipment_id = e.equipment_id
    WHERE (o.total_price- o.amount_paid) > 0;
  `;

  db.query(pendingPaymentsSql, (err, pendingPayments) => {
    if (err) {
      console.error('Error fetching pending payments:', err);
      throw err;
    }

    res.render('pending-payment-report', { pendingPayments });
  });
});




// Route for profit report with date range
// Route to display a report of monthly profit
app.get('/profit-report', (req, res) => {
  const selectedMonth = req.query.month;

  // SQL query to get monthly profit data
  const profitSql = `
      SELECT
          DATE_FORMAT(o.start_date, '%Y-%m') AS month,
          SUM(o.total_price) AS total_amount,
          (SUM(o.total_price) * 0.35) AS profit
      FROM orders o
      WHERE DATE_FORMAT(o.start_date, '%Y-%m') = ?
      GROUP BY month;
  `;

  db.query(profitSql, [selectedMonth], (err, profitData) => {
      if (err) {
          console.error('Error fetching monthly profit:', err);
          throw err;
      }
console.log(profitData)
      // Render the profit report template with the fetched data
      res.render('profit-report', { profitData, selectedMonth });
  });
});

app.post('/manager-register', (req, res) => {
  const { name, username, password } = req.body;

  // Validate and save manager registration data to the database
  // Example using MySQL queries (make sure to sanitize inputs and handle errors)
  const sql = 'INSERT INTO managers (name, username, password) VALUES (?, ?, ?)';
  db.query(sql, [name, username, password], (err, result) => {
    if (err) {
      console.error('Error registering manager:', err);
      // Handle registration error (e.g., redirect to registration page with an error message)
      res.redirect('/manager-register');
    } else {
      // Redirect to manager dashboard or login page after successful registration
      res.redirect('/login');

    }
  });
});
app.get('/manager-register', (req, res) => {
  res.render('manager-register');
});

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });