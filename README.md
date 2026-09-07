# Advanced Expense Tracker with Backend

A modern, full-stack expense tracking application with user authentication, multi-currency support, categories, filtering, and statistics.

## Features

### 🎨 Advanced UI/UX
- Modern gradient design with glassmorphism effects
- Responsive design for all devices
- Smooth animations and transitions
- Professional styling with hover effects

### 🔐 User Authentication
- Secure user registration and login
- JWT token-based authentication
- Password hashing with bcrypt
- Persistent login sessions

### 💰 Multi-Currency Support
- Support for 8+ currencies (INR, USD, EUR, GBP, JPY, RUB, KRW, NGN)
- User-specific currency preferences
- Real-time currency switching

### 📊 Advanced Features
- Expense categorization
- Date-based expense tracking
- Advanced filtering (by date range and category)
- Comprehensive statistics and analytics
- Category-wise spending breakdown
- Monthly spending trends

### 🗄️ Backend API
- RESTful API with Express.js
- JSON file-based data storage (easily upgradeable to databases)
- CORS enabled for frontend communication
- Comprehensive error handling

## Setup Instructions

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd expense tracker/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the backend server:**
   ```bash
   npm start
   ```
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:3001`

### Frontend Setup

1. **Open the application:**
   - Simply open `index.html` in your web browser
   - Or serve it through a local server for better experience

2. **For local server (recommended):**
   ```bash
   # If you have Python installed
   python -m http.server 8000

   # Or with Node.js
   npx http-server -p 8000
   ```

   Then open `http://localhost:8000` in your browser

### GitHub Pages

The frontend deploys automatically from the `main` branch using GitHub Actions. In GitHub, open **Settings > Pages** and set **Source** to **GitHub Actions**. The published site uses browser local storage, so account and transaction data stays in the browser used to access the site. The Node.js backend is used when running the project locally.

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/currency` - Update user currency

### Expenses
- `GET /api/expenses` - Get all expenses (with optional filters)
- `POST /api/expenses` - Add new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `GET /api/expenses/stats` - Get expense statistics

## Usage

1. **Start the backend server** as described above
2. **Open the frontend** in your browser
3. **Create an account** or login if you already have one
4. **Set your preferred currency** from the dropdown
5. **Add expenses** with title, amount, category, and date
6. **Use filters** to view expenses by date range or category
7. **View statistics** by clicking the "Statistics" button
8. **Delete expenses** using the trash icon next to each expense

## Technologies Used

### Frontend
- HTML5
- CSS3 (Modern features, Flexbox, Grid, Animations)
- Vanilla JavaScript (ES6+)
- Local Storage for client-side persistence

### Backend
- Node.js
- Express.js
- bcryptjs (password hashing)
- jsonwebtoken (JWT authentication)
- uuid (unique ID generation)
- CORS (cross-origin resource sharing)

## Data Storage

Currently uses JSON file storage for simplicity. The data is stored in `backend/data.json`. This can be easily upgraded to:
- MongoDB
- PostgreSQL
- MySQL
- SQLite
- Any other database

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- CORS protection
- Input validation
- Secure API endpoints

## Future Enhancements

- [ ] Email verification for registration
- [ ] Password reset functionality
- [ ] Expense export (PDF/CSV)
- [ ] Budget setting and tracking
- [ ] Recurring expenses
- [ ] Data visualization charts
- [ ] Multi-user expense sharing
- [ ] Mobile app version
- [ ] Cloud database integration

## Contributing

Feel free to contribute to this project by:
- Reporting bugs
- Suggesting new features
- Submitting pull requests
- Improving documentation

## License

This project is open source and available under the MIT License.