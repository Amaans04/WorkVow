# Sales Commitment and Reporting System - Setup Instructions

This document contains detailed instructions for setting up and running the Sales Commitment and Reporting System.

## Project Overview

The Sales Commitment and Reporting System is a full-stack application designed for sales teams to:
- Set and track daily sales goals
- Report on daily progress and achievements
- Book and manage prospect meetings
- Track performance metrics
- View leaderboards and announcements

## Setup Instructions

### 1. Prerequisites

Make sure you have the following installed:
- Node.js (version 16 or newer)
- npm (comes with Node.js) or yarn
- Git
- Firebase account (free tier is sufficient for development)
- Code editor (VSCode recommended)

### 2. Clone the Repository

```bash
git clone https://github.com/yourusername/sales-commitment-reporting-system.git
cd sales-commitment-reporting-system
```

### 3. Install Dependencies

```bash
npm install
# or
yarn
```

### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
   - Give it a name (e.g., "Sales Commitment System")
   - Configure Google Analytics (optional)
   - Click "Create Project"

3. Set up Authentication:
   - In the Firebase console, navigate to "Authentication"
   - Click "Get Started"
   - Enable the "Email/Password" sign-in method
   - (Optional) Add other authentication methods as needed

4. Set up Firestore Database:
   - In the Firebase console, navigate to "Firestore Database"
   - Click "Create Database"
   - Start in production mode or test mode as per your needs
   - Choose a location (preferably close to your target users)
   - Set up security rules (for development, you can start with test mode)

5. Get Firebase Configuration:
   - In the Firebase console, click on the gear icon (Project Settings)
   - Scroll down to "Your apps" section
   - Click "Add app" and select the web platform (</> icon)
   - Register the app with any nickname
   - Copy the Firebase configuration object (apiKey, authDomain, etc.)

### 5. Environment Variables Setup

1. Create a `.env.local` file in the root of your project:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

Replace the placeholder values with your actual Firebase configuration.

### 6. (Optional) Firebase Emulators Setup for Local Development

Firebase emulators allow you to test your app against local Firebase services without affecting your production data.

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select the following options during setup:
# - Firestore
# - Authentication
# - Emulators (Firestore and Authentication)
```

When asked for the Firebase project, select the one you created earlier.

To start the emulators:
```bash
firebase emulators:start
```

### 7. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

### 8. Access the Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Initial Data Setup

When you first run the application, you'll need to create an initial admin user:

1. Go to the registration page and create a new user
2. In Firebase Console, navigate to Firestore Database
3. Find the user document in the "users" collection
4. Manually update the "role" field to "admin"

Now you can log in as an admin and create additional users through the application.

## Firestore Database Structure

The application uses the following collections in Firestore:

- **users** - User profiles and authentication data
- **commitments** - Morning sales commitments
- **reports** - Evening sales reports
- **announcements** - Company announcements
- **prospects** - Customer/prospect data

## Troubleshooting

### Common Issues

1. **Firebase connection issues**:
   - Verify your environment variables are correct
   - Check if your IP is allowed in Firebase security rules
   - Try using Firebase emulators for local development

2. **Dependency issues**:
   - Try deleting node_modules and package-lock.json, then run `npm install` again

3. **Next.js build errors**:
   - Check for TypeScript errors in your code
   - Ensure all required dependencies are installed

For additional help, please open an issue in the repository.

## Firebase Emulator Setup

If you're using Firebase emulators for local development, please add the following environment variable to your `.env.local` file:

```
# Control whether to use Firebase emulators
# Set to 'true' to use emulators, 'false' to use production Firebase
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
```

Set this to `true` only if you have the Firebase emulators running. If you're experiencing connection errors with the emulators, set this to `false` to use the production Firebase services instead.

To start the Firebase emulators, run:

```bash
firebase emulators:start
```

Make sure you have the Firebase CLI installed and configured correctly. 