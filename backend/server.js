const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Data storage (in production, use a real database)
const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  const initialData = {
    users: [],
    expenses: {}
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

// Helper functions
const readData = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return { users: [], expenses: {} };
  }
};

const writeData = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing data file:', error);
  }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const data = readData();

    // Check if user exists
    if (data.users.find(user => user.username === username)) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      id: uuidv4(),
      username,
      password: hashedPassword,
      currency: '₹',
      createdAt: new Date().toISOString()
    };

    data.users.push(user);
    data.expenses[user.id] = [];

    writeData(data);

    // Generate token
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user.id, username: user.username, currency: user.currency }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const data = readData();
    const user = data.users.find(user => user.username === username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, currency: user.currency }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
app.get('/api/auth/profile', authenticateToken, (req, res) => {
  const data = readData();
  const user = data.users.find(user => user.id === req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({
    id: user.id,
    username: user.username,
    currency: user.currency,
    createdAt: user.createdAt
  });
});

// Update user currency
app.put('/api/auth/currency', authenticateToken, (req, res) => {
  try {
    const { currency } = req.body;
    const data = readData();

    const userIndex = data.users.findIndex(user => user.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    data.users[userIndex].currency = currency;
    writeData(data);

    res.json({ message: 'Currency updated successfully', currency });
  } catch (error) {
    console.error('Currency update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get expenses
app.get('/api/expenses', authenticateToken, (req, res) => {
  const data = readData();
  const expenses = data.expenses[req.user.id] || [];

  // Add filtering and sorting options
  let filteredExpenses = [...expenses];

  // Filter by date range
  if (req.query.startDate) {
    filteredExpenses = filteredExpenses.filter(exp =>
      new Date(exp.date) >= new Date(req.query.startDate)
    );
  }

  if (req.query.endDate) {
    filteredExpenses = filteredExpenses.filter(exp =>
      new Date(exp.date) <= new Date(req.query.endDate)
    );
  }

  // Filter by category
  if (req.query.category) {
    filteredExpenses = filteredExpenses.filter(exp =>
      exp.category === req.query.category
    );
  }

  // Sort by date (newest first)
  filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json(filteredExpenses);
});

// Add expense
app.post('/api/expenses', authenticateToken, (req, res) => {
  try {
    const { title, amount, category, date, type, description } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ message: 'Title and amount required' });
    }

    const data = readData();
    const expense = {
      id: uuidv4(),
      title,
      amount: parseFloat(amount),
      category: category || 'General',
      date: date || new Date().toISOString().split('T')[0],
      type: type || 'expense',
      description: description || '',
      createdAt: new Date().toISOString()
    };

    if (!data.expenses[req.user.id]) {
      data.expenses[req.user.id] = [];
    }

    data.expenses[req.user.id].push(expense);
    writeData(data);

    res.status(201).json(expense);
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update expense
app.put('/api/expenses/:id', authenticateToken, (req, res) => {
  try {
    const { title, amount, category, date, type, description } = req.body;
    const data = readData();
    const expenses = data.expenses[req.user.id] || [];

    const expenseIndex = expenses.findIndex(exp => exp.id === req.params.id);
    if (expenseIndex === -1) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    expenses[expenseIndex] = {
      ...expenses[expenseIndex],
      title: title || expenses[expenseIndex].title,
      amount: amount ? parseFloat(amount) : expenses[expenseIndex].amount,
      category: category || expenses[expenseIndex].category,
      date: date || expenses[expenseIndex].date,
      type: type || expenses[expenseIndex].type || 'expense',
      description: description || expenses[expenseIndex].description || '',
      updatedAt: new Date().toISOString()
    };

    writeData(data);
    res.json(expenses[expenseIndex]);
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete expense
app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
  try {
    const data = readData();
    const expenses = data.expenses[req.user.id] || [];

    const expenseIndex = expenses.findIndex(exp => exp.id === req.params.id);
    if (expenseIndex === -1) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const deletedExpense = expenses.splice(expenseIndex, 1)[0];
    writeData(data);

    res.json({ message: 'Expense deleted successfully', expense: deletedExpense });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get expense statistics
app.get('/api/expenses/stats', authenticateToken, (req, res) => {
  const data = readData();
  const expenses = data.expenses[req.user.id] || [];
  const count = expenses.length;
  let income = 0;
  let expenseSum = 0;
  const categories = {};
  const monthly = {};

  expenses.forEach(exp => {
    const amt = parseFloat(exp.amount) || 0;
    if (exp.type === 'income') income += amt;
    else expenseSum += amt;

    // category breakdown (sum absolute amounts)
    categories[exp.category] = (categories[exp.category] || 0) + amt;

    // monthly breakdown
    const month = (exp.date || '').substring(0,7);
    if (month) monthly[month] = (monthly[month] || 0) + (exp.type === 'income' ? amt : -amt);
  });

  const total = income - expenseSum;
  const average = count > 0 ? (income - expenseSum) / count : 0;

  res.json({ total, count, average, income, expenses: expenseSum, categories, monthly });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});