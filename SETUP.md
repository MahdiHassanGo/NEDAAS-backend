# Backend Setup Guide

## .env File Configuration

Create a `.env` file in the `backend` directory with the following variables:

### 1. MongoDB Atlas Connection

Get your MongoDB connection string from MongoDB Atlas:
1. Go to your MongoDB Atlas dashboard
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your actual password
6. Replace `<dbname>` with `nedaas` (or your preferred database name)

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nedaas?retryWrites=true&w=majority
```

**Example:**
```env
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/nedaas?retryWrites=true&w=majority
```

### 2. Firebase Admin SDK Credentials

Get your Firebase Admin credentials:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (nedaas-bf431)
3. Click the gear icon ⚙️ → Project Settings
4. Go to "Service accounts" tab
5. Click "Generate new private key"
6. A JSON file will download

From the JSON file, copy:
- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY`

**Important:** For the private key, you have two options:

#### Option 1: With escaped newlines (Recommended)
```env
FIREBASE_PROJECT_ID=nedaas-bf431
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@nedaas-bf431.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

#### Option 2: With actual newlines (Alternative)
If your .env file supports multiline values, you can paste the key directly:
```env
FIREBASE_PROJECT_ID=nedaas-bf431
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@nedaas-bf431.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----"
```

### 3. Port (Optional)
```env
PORT=5000
```

## Complete .env Example

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nedaas?retryWrites=true&w=majority
FIREBASE_PROJECT_ID=nedaas-bf431
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@nedaas-bf431.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

## Common Issues

### Issue 1: "Failed to parse private key"
- Make sure the private key is wrapped in quotes
- Use `\n` for newlines (not actual line breaks)
- Copy the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

### Issue 2: "MongoDB connection error"
- Check that your MongoDB Atlas cluster is running
- Verify your username and password are correct
- Make sure your IP address is whitelisted in MongoDB Atlas (Network Access)
- Check that the connection string format is correct

### Issue 3: "Firebase Admin not initialized"
- Verify all three Firebase variables are set in .env
- Check that the private key format is correct
- Make sure there are no extra spaces or quotes

## Testing the Setup

After configuring your .env file:

1. Start the server:
   ```bash
   npm start
   ```

2. You should see:
   ```
   ✅ Firebase Admin initialized successfully
   ✅ Connected to MongoDB
   ✅ Server is running on port 5000
   ```

3. If you see errors, check the error messages above and verify your .env file.

