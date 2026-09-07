// ===== HOMEPAGE & AUTH FUNCTIONS =====
const API_BASE = 'http://localhost:3001'; // change if backend runs elsewhere

function goToAuth() {
  document.getElementById('homepage').style.display = 'none';
  document.getElementById('auth').style.display = 'flex';
  showLogin();
}

function goToHomepage() {
  document.getElementById('auth').style.display = 'none';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('homepage').style.display = 'block';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
}

function showSignup() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'block';
}

function showLogin() {
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
}

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  section.scrollIntoView({ behavior: 'smooth' });
}

// ===== AUTHENTICATION =====
function signup() {
  // Register with backend; fallback to localStorage when server unreachable
  (async () => {
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    if (!username || !email || !password || !confirmPassword) {
      alert('Please fill all fields');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 4) {
      alert('Password must be at least 4 characters');
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (resp.ok) {
        const data = await resp.json();
        // store token and user
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUserId', data.user.id);
        localStorage.setItem('currentUser', data.user.username);
        alert('Account created and signed in');
        document.getElementById('signup-username').value = '';
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-password').value = '';
        document.getElementById('signup-confirm-password').value = '';
        document.getElementById('homepage').style.display = 'none';
        document.getElementById('auth').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadDashboard();
        loadTransactions();
        updateDashboardStats();
        return;
      } else {
        const err = await resp.json().catch(()=>({message:'Register failed'}));
        alert('Register error: ' + (err.message || resp.statusText));
        return;
      }
    } catch (e) {
      console.debug('Register fetch failed, falling back to localStorage', e);
      // fallback: localStorage
      let users = JSON.parse(localStorage.getItem('users')) || [];
      if (users.find(u => u.username === username)) {
        alert('Username already exists');
        return;
      }
      const user = { username, email, password, joinedDate: new Date().toISOString() };
      users.push(user);
      localStorage.setItem('users', JSON.stringify(users));
      alert('Account created locally. Please login.');
      showLogin();
    }
  })();
}

function login() {
  (async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
      alert('Please fill all fields');
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (resp.ok) {
        const data = await resp.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUserId', data.user.id);
        localStorage.setItem('currentUser', data.user.username);

        document.getElementById('homepage').style.display = 'none';
        document.getElementById('auth').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';

        loadDashboard();
        loadTransactions();
        updateDashboardStats();
        return;
      }

      // if server responds but credentials invalid
      const err = await resp.json().catch(()=>({message:'Invalid credentials'}));
      alert(err.message || 'Login failed');
    } catch (e) {
      console.debug('Login fetch failed, falling back to localStorage', e);
      // fallback to local storage auth
      let users = JSON.parse(localStorage.getItem('users')) || [];
      if (!users || users.length === 0) {
        alert('No accounts found. Please sign up first.');
        return;
      }
      const found = users.find(u => u.username === username && u.password === password);
      if (found) {
        localStorage.setItem('currentUser', username);
        document.getElementById('homepage').style.display = 'none';
        document.getElementById('auth').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        loadDashboard();
        loadTransactions();
        updateDashboardStats();
      } else {
        alert('Invalid username or password');
      }
    }
  })();
}

function logout() {
  const confirm = window.confirm('Are you sure you want to logout?');
  if (confirm) {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('token');
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('auth').style.display = 'none';
    document.getElementById('homepage').style.display = 'block';
  }
}

function forgotPassword() {
  const username = prompt('Enter your username:');
  if (username) {
    let users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.username === username);
    if (user) {
      alert('Your password is: ' + user.password);
    } else {
      alert('Username not found');
    }
  }
}

// ===== DASHBOARD VIEW =====
function showDashboardView(viewName, el) {
  const views = document.querySelectorAll('.view');
  views.forEach(view => view.style.display = 'none');

  const target = document.getElementById(viewName + '-view');
  if (target) target.style.display = 'block';

  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => item.classList.remove('active'));
  if (el) el.classList.add('active');

  if (viewName === 'statistics') {
    loadTransactions();
    updateDashboardStats();
    loadStatistics();
  }
}

async function loadStatistics() {
  const token = localStorage.getItem('token');
  const currentUser = localStorage.getItem('currentUser') || '';
  let stats = null;
  let tx = [];

  if (token) {
    try {
      const resp = await fetch(`${API_BASE}/api/expenses/stats`, { headers: { 'Authorization': 'Bearer ' + token } });
      if (resp.ok) stats = await resp.json();
      const resp2 = await fetch(`${API_BASE}/api/expenses`, { headers: { 'Authorization': 'Bearer ' + token } });
      if (resp2.ok) tx = await resp2.json();
    } catch (err) {
      console.debug('loadStatistics server failed, falling back', err);
    }
  }

  if (!stats) {
    // compute locally
    tx = tx.length ? tx : (JSON.parse(localStorage.getItem(currentUser + '_transactions')) || []);
    const count = tx.length;
    let income = 0, expenses = 0;
    tx.forEach(t => { const a = parseFloat(t.amount) || 0; if (t.type === 'income') income += a; else expenses += a; });
    const total = income - expenses;
    const average = count > 0 ? (expenses / count) : 0;
    // category and monthly breakdown
    const categories = {};
    const monthly = {};
    tx.forEach(t => {
      const a = parseFloat(t.amount) || 0;
      categories[t.category] = (categories[t.category] || 0) + a;
      const m = (t.date || '').substring(0,7);
      if (m) monthly[m] = (monthly[m] || 0) + (t.type === 'income' ? a : -a);
    });
    stats = { total, count, average, income, expenses, categories, monthly };
  }

  document.getElementById('stats-total').textContent = (stats.expenses || 0).toFixed(2);
  document.getElementById('stats-count').textContent = (stats.count || 0);
  document.getElementById('stats-average').textContent = ((stats.average || 0)).toFixed(2);

  // render charts using the same renderCharts logic but ensure charts use stats
  // category chart expects absolute values per category
  const catLabels = Object.keys(stats.categories || {});
  const catData = catLabels.map(k => Math.abs(stats.categories[k] || 0));
  const ctxCat = document.getElementById('category-chart').getContext('2d');
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctxCat, {
    type: 'doughnut',
    data: { labels: catLabels, datasets: [{ data: catData, backgroundColor: catLabels.map(randomColor) }] },
    options: { responsive: true }
  });

  const monthLabels = Object.keys(stats.monthly || {}).sort();
  // derive separate income/expense per month from tx if available, otherwise infer from monthly net only
  const incomePerMonth = {};
  const expensePerMonth = {};
  // if we have detailed tx list in local scope, try to build per-month income/expense
  if (Array.isArray(tx) && tx.length) {
    tx.forEach(t => {
      const m = (t.date || '').substring(0,7);
      if (!m) return;
      const a = parseFloat(t.amount) || 0;
      if (t.type === 'income') incomePerMonth[m] = (incomePerMonth[m] || 0) + a;
      else expensePerMonth[m] = (expensePerMonth[m] || 0) + a;
    });
  } else {
    // fallback: split net into positive/negative components where possible
    monthLabels.forEach(m => {
      const v = stats.monthly[m] || 0;
      if (v >= 0) { incomePerMonth[m] = v; expensePerMonth[m] = 0; }
      else { incomePerMonth[m] = 0; expensePerMonth[m] = Math.abs(v); }
    });
  }

  const incomeData = monthLabels.map(m => incomePerMonth[m] || 0);
  const expensesData = monthLabels.map(m => expensePerMonth[m] || 0);
  const netData = monthLabels.map((m, i) => (incomeData[i] || 0) - (expensesData[i] || 0));

  const ctxMon = document.getElementById('monthly-chart').getContext('2d');
  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctxMon, {
    type: 'bar',
    data: {
      labels: monthLabels,
      datasets: [
        { label: 'Income', data: incomeData, backgroundColor: 'rgba(75,192,192,0.6)' },
        { label: 'Expenses', data: expensesData, backgroundColor: 'rgba(255,99,132,0.6)' },
        { label: 'Net', data: netData, backgroundColor: 'rgba(54,162,235,0.6)' }
      ]
    },
    options: { responsive: true }
  });
}

function loadDashboard() {
  const currentUser = localStorage.getItem('currentUser');
  let users = JSON.parse(localStorage.getItem('users')) || [];
  const user = users.find(u => u.username === currentUser);

  if (user) {
    updateDashboardStats();
  }
}

/* dashboard stats updated by new updateDashboardStats() defined later */

// ===== PROFILE MODAL =====
function showProfileModal() {
  const token = localStorage.getItem('token');
  const currentUser = localStorage.getItem('currentUser') || '';

  (async () => {
    if (token) {
      try {
        const resp = await fetch(`${API_BASE}/api/auth/profile`, { headers: { 'Authorization': 'Bearer ' + token } });
        if (resp.ok) {
          const u = await resp.json();
          document.getElementById('profile-username').textContent = u.username;
          document.getElementById('profile-email').textContent = (u.email || '') ;
          document.getElementById('profile-joined').textContent = 'Joined: ' + new Date(u.createdAt || new Date()).toLocaleDateString();
          // fetch expenses to compute totals
          const expensesResp = await fetch(`${API_BASE}/api/expenses`, { headers: { 'Authorization': 'Bearer ' + token } });
          const expenses = expensesResp.ok ? await expensesResp.json() : [];
          const expenseItems = expenses.filter(t => t.type === 'expense' || (!t.type && t.amount));
          const totalSpent = expenseItems.reduce((sum, e) => sum + e.amount, 0);
          document.getElementById('profile-total-expenses').textContent = expenseItems.length;
          document.getElementById('profile-total-spent').textContent = totalSpent.toFixed(2);
          const joinedDate = new Date(u.createdAt || new Date());
          const today = new Date();
          const days = Math.floor((today - joinedDate) / (1000 * 60 * 60 * 24));
          document.getElementById('profile-days').textContent = days + ' days';
          document.getElementById('profile-modal').style.display = 'block';
          return;
        }
      } catch (err) {
        console.debug('showProfileModal server failed, falling back', err);
      }
    }

    // fallback local
    let users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.username === currentUser);
    let tx = JSON.parse(localStorage.getItem(currentUser + '_transactions')) || [];
    if (user) {
      document.getElementById('profile-username').textContent = user.username;
      document.getElementById('profile-email').textContent = user.email;
      document.getElementById('profile-joined').textContent = 'Joined: ' + new Date(user.joinedDate).toLocaleDateString();
      const expenseItems = tx.filter(t => t.type === 'expense');
      const totalSpent = expenseItems.reduce((sum, e) => sum + e.amount, 0);
      document.getElementById('profile-total-expenses').textContent = expenseItems.length;
      document.getElementById('profile-total-spent').textContent = totalSpent.toFixed(2);
      const joinedDate = new Date(user.joinedDate);
      const today = new Date();
      const days = Math.floor((today - joinedDate) / (1000 * 60 * 60 * 24));
      document.getElementById('profile-days').textContent = days + ' days';
      document.getElementById('profile-modal').style.display = 'block';
    }
  })();
}

function closeProfileModal() {
  document.getElementById('profile-modal').style.display = 'none';
}

function editProfile() {
  const currentUser = localStorage.getItem('currentUser');
  let users = JSON.parse(localStorage.getItem('users')) || [];
  const user = users.find(u => u.username === currentUser);
  
  const newEmail = prompt('Enter new email:', user.email);
  if (newEmail && newEmail.trim() !== '') {
    user.email = newEmail.trim();
    localStorage.setItem('users', JSON.stringify(users));
    alert('Profile updated successfully!');
    showProfileModal();
  }
}

function changePassword() {
  const currentUser = localStorage.getItem('currentUser');
  let users = JSON.parse(localStorage.getItem('users')) || [];
  const user = users.find(u => u.username === currentUser);
  
  const oldPassword = prompt('Enter current password:');
  if (oldPassword === null) return;
  
  if (oldPassword !== user.password) {
    alert('Current password is incorrect');
    return;
  }
  
  const newPassword = prompt('Enter new password:');
  if (newPassword === null) return;
  
  if (newPassword.length < 4) {
    alert('Password must be at least 4 characters');
    return;
  }
  
  user.password = newPassword;
  localStorage.setItem('users', JSON.stringify(users));
  alert('Password changed successfully!');
}

function deleteAccount() {
  const confirm = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');
  if (confirm) {
    const currentUser = localStorage.getItem('currentUser');
    let users = JSON.parse(localStorage.getItem('users')) || [];
    users = users.filter(u => u.username !== currentUser);
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.removeItem(currentUser + '_transactions');
    localStorage.removeItem('currentUser');
    document.getElementById('profile-modal').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('homepage').style.display = 'block';
    alert('Account deleted successfully!');
  }
}

// ===== EXPENSE FUNCTIONS =====
// ===== TRANSACTION FUNCTIONS =====
let editingId = null;
let categoryChart = null;
let monthlyChart = null;
let latestTransactions = [];

function addTransaction() {
  const title = document.getElementById('title').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const category = document.getElementById('category').value;
  const date = document.getElementById('expense-date').value;
  const type = document.getElementById('type').value;
  const description = document.getElementById('description').value.trim();

  if (!title || isNaN(amount) || amount <= 0 || !date) {
    alert('Please fill all required fields correctly');
    return;
  }

  const token = localStorage.getItem('token');
  const currentUser = localStorage.getItem('currentUser') || '';

  (async () => {
    try {
      if (editingId) {
        // update on server
        if (token) {
          const resp = await fetch(`${API_BASE}/api/expenses/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ title, amount, category, date, type, description })
          });
          if (!resp.ok) throw new Error('Server update failed');
        } else {
          // local fallback
          let tx = JSON.parse(localStorage.getItem(currentUser + '_transactions')) || [];
          tx = tx.map(t => t.id === editingId ? { ...t, title, amount, category, date, type, description } : t);
          localStorage.setItem(currentUser + '_transactions', JSON.stringify(tx));
        }
        editingId = null;
        document.querySelector('.form-actions .primary-btn').textContent = 'Save Transaction';
      } else {
        if (token) {
          const resp = await fetch(`${API_BASE}/api/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ title, amount, category, date, type, description })
          });
          if (!resp.ok) throw new Error('Server add failed');
        } else {
          // local fallback
          let tx = JSON.parse(localStorage.getItem(currentUser + '_transactions')) || [];
          tx.push({ id: Date.now(), title, amount, category, date, type, description });
          localStorage.setItem(currentUser + '_transactions', JSON.stringify(tx));
        }
      }

      clearTransactionForm();
      await loadTransactions();
      updateDashboardStats();
    } catch (err) {
      console.debug('addTransaction error', err);
      alert('Could not save transaction to server; saved locally as fallback');
      clearTransactionForm();
      loadTransactions();
      updateDashboardStats();
    }
  })();
}

async function loadTransactions(filteredList) {
  const token = localStorage.getItem('token');
  const currentUser = localStorage.getItem('currentUser') || '';
  let tx = [];

  if (filteredList) {
    tx = filteredList;
  } else {
    if (token) {
      try {
        const resp = await fetch(`${API_BASE}/api/expenses`, { headers: { 'Authorization': 'Bearer ' + token } });
        if (resp.ok) {
          tx = await resp.json();
        } else {
          throw new Error('Server error');
        }
      } catch (err) {
        console.debug('loadTransactions fetch failed, falling back to localStorage', err);
        tx = JSON.parse(localStorage.getItem(currentUser + '_transactions')) || [];
      }
    } else {
      tx = JSON.parse(localStorage.getItem(currentUser + '_transactions')) || [];
    }
  }

  latestTransactions = tx;

  const tbody = document.getElementById('list');
  const totalEl = document.getElementById('total');
  tbody.innerHTML = '';

  // sort by date desc then id
  tx.sort((a,b) => (b.date || 0).localeCompare(a.date || 0) || (b.id > a.id ? 1 : -1));

  let incomeSum = 0, expenseSum = 0;

  tx.forEach(t => {
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'income') incomeSum += amt;
    else expenseSum += amt;

    const tr = document.createElement('tr');
    const currency = document.getElementById('currency-symbol').textContent;
    const isIncome = t.type === 'income';
    const displayAmount = (isIncome ? '' : '-') + currency + Math.abs(amt).toFixed(2);
    // ensure id is safely quoted for onclick
    tr.innerHTML = `
      <td>${t.date}</td>
      <td>${escapeHtml(t.title)}<br><small>${escapeHtml(t.description || '')}</small></td>
      <td>${t.category}</td>
      <td>${t.type}</td>
      <td class="amount ${isIncome ? 'income' : 'expense'}">${displayAmount}</td>
      <td>
        <button onclick="startEdit('${t.id}')">Edit</button>
        <button onclick="deleteTransaction('${t.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const net = incomeSum - expenseSum;
  totalEl.textContent = net.toFixed(2);

  // update dashboard summary fields
  document.getElementById('total-income').textContent = incomeSum.toFixed(2);
  document.getElementById('total-expenses').textContent = expenseSum.toFixed(2);
  document.getElementById('balance').textContent = net.toFixed(2);

  renderCharts(tx);
  return tx;
}

function startEdit(id) {
  const t = latestTransactions.find(x => String(x.id) === String(id));
  if (!t) return;
  editingId = id;
  document.getElementById('title').value = t.title;
  document.getElementById('amount').value = t.amount;
  document.getElementById('category').value = t.category;
  document.getElementById('expense-date').value = t.date;
  document.getElementById('type').value = t.type || 'expense';
  document.getElementById('description').value = t.description || '';
  document.querySelector('.form-actions .primary-btn').textContent = 'Update Transaction';
}

function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;
  const token = localStorage.getItem('token');
  const currentUser = localStorage.getItem('currentUser') || '';
  (async () => {
    try {
      if (token) {
        const resp = await fetch(`${API_BASE}/api/expenses/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        if (!resp.ok) throw new Error('Server delete failed');
      } else {
        let tx = JSON.parse(localStorage.getItem(currentUser + '_transactions')) || [];
        tx = tx.filter(t => String(t.id) !== String(id));
        localStorage.setItem(currentUser + '_transactions', JSON.stringify(tx));
      }
      await loadTransactions();
      updateDashboardStats();
    } catch (err) {
      console.debug('deleteTransaction error', err);
      alert('Could not delete on server; removed locally as fallback');
      let tx = JSON.parse(localStorage.getItem(currentUser + '_transactions')) || [];
      tx = tx.filter(t => String(t.id) !== String(id));
      localStorage.setItem(currentUser + '_transactions', JSON.stringify(tx));
      loadTransactions();
      updateDashboardStats();
    }
  })();
}

function clearTransactionForm() {
  document.getElementById('title').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('category').value = 'General';
  document.getElementById('expense-date').value = '';
  document.getElementById('description').value = '';
  document.getElementById('type').value = 'expense';
  editingId = null;
  const btn = document.querySelector('.form-actions .primary-btn');
  if (btn) btn.textContent = 'Save Transaction';
}

function changeCurrency() {
  const currency = document.getElementById('currency').value;
  document.getElementById('currency-symbol').textContent = currency;
  const dashCurrencies = document.querySelectorAll('#dashboard-currency, #profile-currency');
  dashCurrencies.forEach(n => n.textContent = currency);
  loadTransactions();
}

function applyFilters() {
  const token = localStorage.getItem('token');
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  const category = document.getElementById('filter-category').value;

  (async () => {
    if (token) {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (category) params.append('category', category);
        const resp = await fetch(`${API_BASE}/api/expenses?${params.toString()}`, { headers: { 'Authorization': 'Bearer ' + token } });
        if (resp.ok) {
          const data = await resp.json();
          loadTransactions(data);
          return;
        }
      } catch (err) {
        console.debug('applyFilters server failed, falling back', err);
      }
    }

    // fallback to local filtering
    const currentUser = localStorage.getItem('currentUser');
    let tx = JSON.parse(localStorage.getItem(currentUser + '_transactions')) || [];
    let filtered = tx.filter(e => {
      let dateMatch = true;
      if (startDate) dateMatch = dateMatch && e.date >= startDate;
      if (endDate) dateMatch = dateMatch && e.date <= endDate;
      let categoryMatch = !category || e.category === category;
      return dateMatch && categoryMatch;
    });
    loadTransactions(filtered);
  })();
}

function clearFilters() {
  document.getElementById('start-date').value = '';
  document.getElementById('end-date').value = '';
  document.getElementById('filter-category').value = '';
  document.getElementById('search').value = '';
  loadTransactions();
}

function applySearchFilter() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const token = localStorage.getItem('token');
  (async () => {
    if (token) {
      try {
        const resp = await fetch(`${API_BASE}/api/expenses`, { headers: { 'Authorization': 'Bearer ' + token } });
        if (resp.ok) {
          let tx = await resp.json();
          if (q) tx = tx.filter(t => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
          loadTransactions(tx);
          return;
        }
      } catch (err) {
        console.debug('applySearchFilter server failed, falling back', err);
      }
    }

    const currentUser = localStorage.getItem('currentUser');
    let tx = JSON.parse(localStorage.getItem(currentUser + '_transactions')) || [];
    if (q) tx = tx.filter(t => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
    loadTransactions(tx);
  })();
}

function exportCSV() {
  const tx = latestTransactions.length ? latestTransactions : (JSON.parse(localStorage.getItem((localStorage.getItem('currentUser')||'') + '_transactions')) || []);
  if (tx.length === 0) {
    alert('No transactions to export');
    return;
  }
  const header = ['id','date','title','description','category','type','amount'];
  const rows = tx.map(t => [t.id, t.date, t.title, (t.description||''), t.category, t.type, t.amount]);
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function updateDashboardStats() {
  const token = localStorage.getItem('token');
  const currentUser = localStorage.getItem('currentUser') || '';
  (async () => {
    if (token) {
      try {
        const resp = await fetch(`${API_BASE}/api/expenses/stats`, { headers: { 'Authorization': 'Bearer ' + token } });
        if (resp.ok) {
          const data = await resp.json();
          document.getElementById('balance').textContent = (data.total || 0).toFixed(2);
          document.getElementById('total-income').textContent = (data.income || 0).toFixed(2);
          document.getElementById('total-expenses').textContent = (data.expenses || 0).toFixed(2);
          document.getElementById('month-total').textContent = (data.monthly ? (data.monthly[new Date().toISOString().substring(0,7)] || 0) : 0).toFixed(2);
          return;
        }
      } catch (err) {
        console.debug('updateDashboardStats server failed, falling back', err);
      }
    }

    // fallback local calculation
    let tx = JSON.parse(localStorage.getItem(currentUser + '_transactions')) || [];
    const income = tx.filter(t => t.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const expenses = tx.filter(t => t.type === 'expense').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const total = income - expenses;
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthTotal = tx
      .filter(t => new Date(t.date) >= monthStart)
      .reduce((s, t) => {
        const a = parseFloat(t.amount) || 0;
        return t.type === 'income' ? s + a : s - a;
      }, 0);

    document.getElementById('balance').textContent = total.toFixed(2);
    document.getElementById('total-income').textContent = income.toFixed(2);
    document.getElementById('total-expenses').textContent = expenses.toFixed(2);
    document.getElementById('month-total').textContent = monthTotal.toFixed(2);
  })();
}

function renderCharts(transactions) {
  // category chart
  const byCategory = {};
  transactions.forEach(t => {
    const amt = parseFloat(t.amount) || 0;
    const sign = t.type === 'income' ? 1 : -1;
    byCategory[t.category] = (byCategory[t.category] || 0) + sign * amt;
  });
  const catLabels = Object.keys(byCategory);
  const catData = Object.values(byCategory).map(v => Math.abs(v));

  const ctxCat = document.getElementById('category-chart').getContext('2d');
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctxCat, {
    type: 'doughnut',
    data: { labels: catLabels, datasets: [{ data: catData, backgroundColor: catLabels.map(randomColor) }] },
    options: { responsive: true }
  });

  // monthly chart
  const byMonth = {};
  transactions.forEach(t => {
    const m = (t.date || '').substring(0,7);
    if (!m) return;
    const amt = parseFloat(t.amount) || 0;
    byMonth[m] = (byMonth[m] || 0) + (t.type === 'income' ? amt : -amt);
  });
  const monthLabels = Object.keys(byMonth).sort();
  const monthData = monthLabels.map(k => byMonth[k]);

  const ctxMon = document.getElementById('monthly-chart').getContext('2d');
  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctxMon, {
    type: 'bar',
    data: { labels: monthLabels, datasets: [{ label: 'Net', data: monthData, backgroundColor: monthData.map(v => v>=0? 'rgba(75,192,192,0.6)' : 'rgba(255,99,132,0.6)') }] },
    options: { responsive: true }
  });
}

function randomColor(i){
  const r = Math.floor(Math.random()*155)+80;
  const g = Math.floor(Math.random()*155)+80;
  const b = Math.floor(Math.random()*155)+80;
  return `rgba(${r},${g},${b},0.8)`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function toggleDarkMode(){
  const checked = document.getElementById('dark-mode-toggle').checked;
  if(checked) document.body.classList.add('dark'); else document.body.classList.remove('dark');
  localStorage.setItem('darkMode', checked ? '1' : '0');
}

// Set default date to today and wire up initial state
document.addEventListener('DOMContentLoaded', function() {
  const today = new Date().toISOString().split('T')[0];
  const expenseDateInput = document.getElementById('expense-date');
  if (expenseDateInput) expenseDateInput.value = today;

  const dark = localStorage.getItem('darkMode') === '1';
  document.getElementById('dark-mode-toggle').checked = dark;
  if (dark) document.body.classList.add('dark');

  // if a user is already logged in, load their data
  if (localStorage.getItem('currentUser')) {
    loadDashboard();
    loadTransactions();
    updateDashboardStats();
  }
});