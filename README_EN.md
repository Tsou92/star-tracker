# Bilushi Growth System

Bilushi Growth System is a children's growth incentive platform developed based on React and Firebase. It helps parents cultivate good habits in children through task check-ins and star reward mechanisms.

## Project Features

### 1. Calendar View
- Display Gregorian and lunar dates
- Mark solar terms and special festivals
- Show task completion status
- Support year (1901-2099) and month selection

### 2. Task Management
- Daily task list display
- Task completion check-in functionality
- Reward stars after completing tasks
- Support different task types (daily, weekly, monthly)

### 3. Star Reward System
- Real-time display of star count
- Support instant reward functionality
- Password verification ensures reward security
- Reward history query

### 4. Admin Features
- Admin account login
- User management (view, disable login, delete)
- Support manual addition of existing users

### 5. Member Profiles
- Support multi-member management
- Member information editing
- Independent storage of member data

### 6. Login System
- Regular user registration/login
- Admin account login
- Password show/hide functionality
- Caps Lock status

## Technology Stack

### Frontend Technology
- **React 19**: Using Hooks (useState, useEffect, useCallback)
- **Vite**: Build tool with Hot Module Replacement (HMR)
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### Backend Technology
- **Firebase Authentication**: User authentication
- **Firestore**: NoSQL database for storing user data and task information

### Development Tools
- **ESLint**: Code quality checking
- **Git**: Version control

## Project Structure

```
star-tracker/
├── src/
│   ├── App.jsx              # Main application component
│   ├── index.css            # Global styles
│   └── main.jsx             # Application entry
├── public/                  # Static resources
├── .gitignore               # Git ignore file
├── eslint.config.js         # ESLint configuration
├── index.html               # HTML template
├── package.json             # Project dependencies
├── postcss.config.js        # PostCSS configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── vite.config.js           # Vite configuration
```

## Core Function Implementation

### 1. Calendar Generation
```javascript
const generateCalendar = (year, month) => {
  // Generate calendar data for the specified month
  // Including Gregorian dates, lunar information, solar terms, etc.
};
```

### 2. Admin Login
```javascript
// Check if it's admin login
if (email === ADMIN_ACCOUNT && password === ADMIN_PASSWORD) {
  onAdminLogin();
  return;
}
```

### 3. Task Completion Handling
```javascript
const handleTaskComplete = (taskId) => {
  // Update task completion status
  // Increase star count
  // Record history
};
```

### 4. Instant Reward
```javascript
const handleRewardSubmit = () => {
  // Password verification
  // Apply reward
  // Update star count and history
};
```

## Development Instructions

### Environment Requirements
- Node.js 18+ 
- npm or yarn

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

### Build Production Version
```bash
npm run build
```

### Code Check
```bash
npm run lint
```

## Admin Account

Default admin account:
- Account: AdminTsou
- Password: Sqxwxq202401zcH

## Project Features

1. **Responsive Design**: Adapt to different screen sizes
2. **Intuitive User Interface**: Clean and easy to use
3. **Secure Reward Mechanism**: Password verification ensures reward security
4. **Complete Task Management**: Support multiple task types
5. **Detailed History Records**: Record all rewards and penalties
6. **Multi-member Support**: Suitable for families with multiple children

## Future Plans

1. Add more task types and reward methods
2. Support data export functionality
3. Add task reminder functionality
4. Optimize mobile experience
5. Add data statistics and analysis functionality

## License

MIT
