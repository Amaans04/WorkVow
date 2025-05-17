# Sales Commitment and Reporting System

A full-stack application for sales teams to manage daily commitments, track performance, and generate reports.

## Features

- **Authentication System** - Role-based access control with Employee, Manager, and Admin roles
- **Dashboard** - Overview of performance metrics, leaderboard, and company announcements
- **Morning Commitment** - Daily goal setting for calls and expected closures
- **Evening Report** - End-of-day reporting with actual calls made and prospects secured
- **Analytics** - Track performance metrics like calls, meetings, and revenue
- **Management Panel** - For managers and admins to view team performance
- **Leaderboard** - Showcase top performers with achievement badges

## Tech Stack

- **Frontend**: React.js, Next.js, Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication)
- **State Management**: React Context API
- **Forms**: React Hook Form
- **Data Visualization**: Chart.js / React-ChartJS-2
- **Icons**: React Icons (Feather)
- **Export**: SheetJS (xlsx)
- **Notifications**: React-Toastify (client-side) & Firebase Cloud Messaging (push)

## Project Structure

```
├── public/                # Static assets
├── src/
│   ├── app/               # Next.js app directory (routes)
│   │   ├── dashboard/     # Dashboard pages
│   │   ├── commitments/   # Morning commitment pages
│   │   ├── reports/       # Evening report pages
│   │   ├── admin/         # Admin panel pages
│   │   ├── login/         # Authentication pages
│   │   └── ...
│   ├── components/        # Reusable components
│   │   ├── ui/            # UI components (buttons, inputs, etc.)
│   │   ├── layout/        # Layout components
│   │   ├── dashboard/     # Dashboard-specific components
│   │   └── ...
│   ├── context/           # React Context providers
│   │   ├── AuthContext.tsx    # Authentication context
│   │   └── ...
│   ├── lib/               # Utility functions and libraries
│   │   ├── firebase.ts    # Firebase configuration
│   │   └── ...
│   └── types/             # TypeScript type definitions
└── ...
```

## Local Development Setup

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Firebase account

### Setup Steps

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/sales-commitment-reporting-system.git
cd sales-commitment-reporting-system
```

2. **Install dependencies**

```bash
npm install
# or
yarn
```

3. **Create a Firebase project**

- Go to [Firebase Console](https://console.firebase.google.com/)
- Create a new project
- Set up Authentication (Email/Password)
- Create a Firestore database

4. **Set up environment variables**

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
```

5. **Set up Firebase Emulators (optional for local development)**

```bash
npm install -g firebase-tools
firebase login
firebase init emulators
```

Select Authentication and Firestore emulators during setup.

6. **Run the development server**

```bash
npm run dev
# or
yarn dev
```

7. **Access the application**

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

1. **Build the application**

```bash
npm run build
# or
yarn build
```

2. **Deploy to hosting service**

You can deploy to various services:

- Vercel (recommended for Next.js):
  ```bash
  npm install -g vercel
  vercel
  ```

- Firebase Hosting:
  ```bash
  firebase deploy
  ```

## License

MIT

## Support

For any questions or issues, please open an issue in the repository or contact support@yourdomain.com.

## Troubleshooting

### Firebase Emulator Connection Issues

If you're experiencing connection errors with Firebase emulators, add this to your `.env.local` file:

```
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
```

Set to `true` only when you have emulators running. See `SETUP_INSTRUCTIONS.md` for details.

### Form Field Autocomplete Warnings

If you see browser warnings about form fields missing autocomplete attributes, these have been fixed in the latest version. Make sure your code includes the `autoComplete` attribute on password fields:

- For login forms: `autoComplete="current-password"`
- For registration forms: `autoComplete="new-password"`
