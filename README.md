# 🏠 RoomXChange — Next-Generation Campus Dorm Exchange Platform

A high-performance, enterprise-grade room exchange platform built to streamline dorm room transfers, automate multi-party swap cycles, resolve room allotment conflicts, and provide administrative oversight for college campuses.

🌐 **Live Web Application**: [https://room-x-change.vercel.app](https://room-x-change.vercel.app)

---

## 🚀 Product Capabilities & Feature Tour

### 📱 1. Mobile-First Drawer & Responsive Experience
Designed for mobile browsers with full responsive adaptation, top-left hamburger navigation drawer, and touch-optimized interfaces.

![Mobile Navigation Drawer](./assets/screenshots/mobile-drawer.png)

- **Role-Aware Hamburger Menu**: Dynamically updates drawer links based on whether the logged-in user is a Student, Admin, or Super Admin.
- **Name Display Optimization**: Formats full student names to display first and last words (`"Gautam Malhotra"`) with custom avatar initials (`"GM"`) and 140px max-width truncation.
- **Touch-Friendly Modals & Tables**: Cards and data tables adapt with horizontal touch scrolling and full-width stacked action buttons on mobile screens.

---

### 🔐 2. Email OTP Authentication & Account Security
Secure onboarding pipeline requiring verified institutional email credentials before granting platform access.

![Authentication & OTP Verification](./assets/screenshots/auth-otp.png)

- **4-Digit OTP Email Delivery**: Sends time-sensitive verification codes via Nodemailer with 15-minute expiration windows.
- **Inbox-Optimized Delivery**: Subjects formatted without sensitive codes (`RoomXChange Verification Code`).
- **Synchronous Session Persistence**: Automatic session context initialization (`setAuthSession`) with immediate authenticated routing.

---

### ⚠️ 3. Room Ownership Conflict Dispute System
Built-in safeguard preventing unauthorized or duplicate room claims during registration.

![Room Conflict Resolution](./assets/screenshots/conflict-reports.png)

- **Duplicate Claim Detection**: Instantly alerts users if their allotted or current room code (`A101`–`F425`) is already registered by another student.
- **One-Tap Conflict Reporting**: Allows students to submit dispute reports directly to campus administrators.
- **Admin Conflict Resolution Console**: Admins can inspect dispute tickets, verify room ownership, and reassign claims.

---

### ⚙️ 4. Student Preferences & Matching Engine
Comprehensive preference customization allowing students to define ideal living arrangements.

![Student Preferences](./assets/screenshots/student-preferences.png)

- **Block & Floor Filtering**: Select preferred campus blocks (`Block A` through `Block F`) and floor levels (`Ground 1xx` through `Top 4xx`).
- **Smart Conflict Validation**: Prevents selecting `None` for both floor and block preferences simultaneously.
- **Live Room Availability Counter**: Displays total available campus rooms in real-time.

---

### 🔄 5. Multi-Party Swap Chains & Cycle Matching
Automates direct 2-way room exchanges and complex N-way circular swap cycles.

![Swap Chain Mapping Modal](./assets/screenshots/swap-chain-modal.png)

- **N-Way Circular Cycle Matching**: Solves multi-student exchange chains (e.g. Student A $\rightarrow$ Student B $\rightarrow$ Student C $\rightarrow$ Student A).
- **Interactive Mapping Modal**: Renders complete chain visualizations showing current room, target room, and live acceptance status (`pending`, `accepted`, `rejected`).
- **Consensus Execution**: Swaps execute automatically once all chain participants accept the proposal.

---

### 🛡️ 6. Admin Operational Console
Centralized management interface for campus dorm administrators.

![Admin Console](./assets/screenshots/admin-dashboard.png)

- **Dispute Oversight**: Track pending, resolved, and dismissed room conflict reports.
- **Campus Room Directory**: Inspect all listed campus rooms, owner allotments, and current occupation statuses.
- **Swap Request Audit**: Monitor active swap proposals across the campus.

---

### 👑 7. Super Admin Governance & Security Console
Top-tier administrative controls for institution leaders and system managers.

![Super Admin Governance Console](./assets/screenshots/superadmin-dashboard.png)

- **Role Elevation & Governance**: Promote normal users to Admin role or demote Admins back to normal user status.
- **Super Admin Demotion & Password Reverification**: Grant Super Admin rights or demote existing Super Admins with mandatory password re-verification (`bcrypt.compare`). Self-demotion is strictly protected.
- **User Account Deletion**: Permanently remove user accounts and associated room claims from the system and database.
- **Platform Analytics**: Comprehensive dashboard tracking registered users, total rooms, pending reports, and weekly/monthly completed swap counts.

---

### ⚡ 8. Hybrid Real-Time & Serverless Architecture
Engineered to run seamlessly across both traditional servers and modern serverless platforms.

![Live Analytics Dashboard](./assets/screenshots/analytics-dashboard.png)

- **Local WebSockets**: Socket.io connection for instant room availability updates during local development.
- **Vercel Serverless Fallback**: Automatic detection of `vercel.app` serverless environments, bypassing stateful socket long-polling to eliminate `404 (Not Found)` browser console errors while providing 20-second REST polling fallback.

---

## 🛠️ Product Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | React 19, Vite 8, React Router v7, Vanilla CSS Design System |
| **Backend API** | Node.js (ES Modules), Express.js |
| **Database** | MongoDB, Mongoose ORM |
| **Authentication & Security** | JWT (JSON Web Tokens), Bcrypt.js Password Hashing, Re-verification Modals |
| **Email Delivery** | Nodemailer (SMTP Engine) |
| **Real-Time Pipeline** | Socket.io + Automatic Vercel Serverless REST Polling Fallback |
| **Hosting & Deployment** | Vercel (Client & Serverless Functions Ready) |

---

## 📂 System File Organization

```
RoomXChange/
├── client/                     # React 19 Single Page Application
│   ├── public/                 # Favicons & public static assets
│   ├── src/
│   │   ├── api/                # Axios instance & interceptors
│   │   ├── components/         # Common UI components (Modal, Button, Input, Badges)
│   │   ├── context/            # AuthContext, ToastContext, SocketContext, ConfirmContext
│   │   ├── layout/             # MainLayout, DashboardLayout, Navbar
│   │   ├── pages/              # Product Pages
│   │   │   ├── auth/           # Login, Register, ForgotPassword
│   │   │   ├── dashboard/      # AdminDashboard, SuperAdminDashboard, UserDashboard
│   │   │   └── rooms/          # BrowseRooms, Preferences, Swap, RoomDetail
│   │   ├── styles/             # Global CSS design tokens & responsive rules
│   │   └── utils/              # Name formatting & utility functions
│   └── vite.config.js
│
├── server/                     # Express REST API & Real-Time Engine
│   ├── config/                 # Database configuration (db.js)
│   ├── controllers/            # Auth, Admin, Room, Swap, Report controllers
│   ├── middleware/             # Auth protection & role authorization
│   ├── models/                 # Mongoose Data Models (User, Room, Swap, Report, Otp)
│   ├── routes/                 # Express API routes
│   ├── services/               # Nodemailer email notification service
│   ├── seed.js                 # Database seeding script
│   └── server.js               # Express application entry point
│
└── README.md
```

---

## ⚙️ Environment Configuration

### Server Environment (`server/.env`)
```env
PORT=5500
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/roomxchange
JWT_SECRET=your_jwt_secret_key_roomxchange
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

### Client Environment (`client/.env`)
```env
VITE_API_URL=http://localhost:5500/api
```

---

## 🚀 Installation & Deployment

### Local Development Setup
```bash
# 1. Clone repository
git clone https://github.com/MGautam-88/RoomXChange.git
cd RoomXChange

# 2. Install & start server
cd server
npm install
npm run seed     # Populate database with campus rooms and initial data
npm run dev

# 3. Install & start client (in new terminal)
cd ../client
npm install
npm run dev
```

### Vercel Production Deployment
1. **Backend**: Import `server/` directory into Vercel, configure environment variables (`MONGO_URI`, `JWT_SECRET`, `EMAIL_USER`, etc.).
2. **Frontend**: Import `client/` directory into Vercel, set `VITE_API_URL` to your deployed backend URL.

---

## 📜 Legal Terms & Platform Governance

- **Hostel Authority Compliance**: RoomXChange is a software platform designed to manage and automate room exchange proposals. All final room transfers remain subject to official campus housing regulations and administrative validation.
- **Data Security & Privacy**: User passwords are encrypted using salted Bcrypt hashes. Student contact information is restricted to active swap chain participants and authorized administrators.

---

## 👨‍💻 Product Author

- **Gautam Malhotra** ([@MGautam-88](https://github.com/MGautam-88)) — Lead Product Architect & Engineer
