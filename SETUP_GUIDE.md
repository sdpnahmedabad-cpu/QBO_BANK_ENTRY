# Multi-Tenant Setup Guide for Team Members

## 🎯 Overview

This guide will help you set up the **Finza** QuickBooks Bank Entry application for different team members or entities. Each entity will have:
- Their own **QuickBooks Developer App** (with unique credentials)
- Their own **Supabase Project** (for data isolation)
- Their own **Environment Configuration**

> [!IMPORTANT]
> Each entity/team member needs their own separate QuickBooks and Supabase setup to ensure complete data isolation and security.

---

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] QuickBooks Online account (for each entity)
- [ ] Intuit Developer account access
- [ ] Supabase account (free tier works)
- [ ] Node.js installed (v18 or higher)
- [ ] Git installed (for version control)
- [ ] n8n account or instance (optional, for PDF parsing)

---

## 🚀 Setup Process (Per Entity)

### Step 1: QuickBooks Developer Account Setup

#### 1.1 Create/Access Intuit Developer Account

1. Go to [developer.intuit.com](https://developer.intuit.com)
2. Sign in with your Intuit account (or create one)
3. Accept the Developer Terms of Service

#### 1.2 Create a New App

1. Click **"My Apps"** in the top navigation
2. Click **"Create an app"** button
3. Select **"QuickBooks Online and Payments"**
4. Fill in the app details:
   - **App Name**: `Finza - [Entity Name]` (e.g., "Finza - Acme Corp")
   - **Description**: "Bank entry automation for QuickBooks"
   - **App Type**: Select "Desktop/Web App"

#### 1.3 Configure OAuth Settings

1. Go to **"Keys & OAuth"** tab
2. Under **"Redirect URIs"**, add:
   ```
   http://localhost:3000/api/auth/qbo/callback
   ```
   
   > [!TIP]
   > For production deployment, also add your production URL:
   > `https://your-domain.com/api/auth/qbo/callback`

3. Click **"Save"**

#### 1.4 Get Your Credentials

1. In the **"Keys & OAuth"** section, you'll see two sets of keys:
   - **Development Keys** (for testing with sandbox)
   - **Production Keys** (for live QuickBooks data)

2. **For Testing/Development**, copy:
   - ✅ **Client ID** (Development)
   - ✅ **Client Secret** (Development)

3. **For Production**, copy:
   - ✅ **Client ID** (Production)
   - ✅ **Client Secret** (Production)

> [!WARNING]
> Keep your Client Secret secure! Never commit it to version control or share it publicly.

---

### Step 2: Supabase Project Setup

#### 2.1 Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click **"New Project"**
4. Fill in project details:
   - **Organization**: Select or create one
   - **Project Name**: `finza-[entity-name]` (e.g., "finza-acme-corp")
   - **Database Password**: Generate a strong password (save it securely!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier works for testing

5. Click **"Create new project"** and wait 2-3 minutes for setup

#### 2.2 Get Supabase Credentials

1. Once the project is ready, go to **"Project Settings"** (gear icon)
2. Click **"API"** in the left sidebar
3. Copy the following values:
   - ✅ **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - ✅ **anon/public key** (starts with `eyJhbGc...`)
   - ✅ **service_role key** (starts with `eyJhbGc...`)

> [!CAUTION]
> The `service_role` key has admin access to your database. Keep it secure and never expose it in client-side code!

#### 2.3 Deploy Database Schema

1. In your Supabase project, go to **"SQL Editor"**
2. Click **"New Query"**
3. Copy the contents of `supabase_schema.sql` from your project folder
4. Paste it into the SQL editor
5. Click **"Run"** to execute the schema

**Alternative Method** (using local file):

```bash
# Navigate to your project directory
cd c:\Users\suniel\Downloads\QBO_BANK_ENTRY\QBO_BANK_ENTRY

# View the schema file
type supabase_schema.sql
```

Then copy and paste the contents into Supabase SQL Editor.

#### 2.4 Verify Database Tables

After running the schema, verify these tables were created:
- ✅ `users` - User accounts and roles
- ✅ `qbo_tokens` - QuickBooks OAuth tokens
- ✅ `qbo_companies` - Connected QuickBooks companies
- ✅ `rules` - Transaction mapping rules
- ✅ `bank_entries` - Bank transaction entries

You can check this in **"Table Editor"** in the Supabase dashboard.

---

### Step 3: Environment Configuration

#### 3.1 Create `.env.local` File

1. In your project folder, create a file named `.env.local`
2. Copy the template below and fill in your values:

```env
# ============================================
# QuickBooks OAuth 2.0 Credentials
# ============================================
# Get these from: https://developer.intuit.com > My Apps > [Your App] > Keys & OAuth

# For SANDBOX/TESTING (Development Keys):
NEXT_PUBLIC_QBO_CLIENT_ID=your_development_client_id_here
QBO_CLIENT_SECRET=your_development_client_secret_here
NEXT_PUBLIC_QBO_ENVIRONMENT=sandbox

# For PRODUCTION (Production Keys):
# NEXT_PUBLIC_QBO_CLIENT_ID=your_production_client_id_here
# QBO_CLIENT_SECRET=your_production_client_secret_here
# NEXT_PUBLIC_QBO_ENVIRONMENT=production

# OAuth Redirect URI (must match Intuit Developer Portal)
NEXT_PUBLIC_QBO_REDIRECT_URI=http://localhost:3000/api/auth/qbo/callback

# Token encryption secret (generate a random string)
QBO_TOKEN_SECRET=your-random-secret-string-here

# ============================================
# Supabase Credentials
# ============================================
# Get these from: Supabase Dashboard > Project Settings > API

NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# n8n Integration (Optional)
# ============================================
# N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/pdf-parser
```

#### 3.2 Generate Token Secret

For `QBO_TOKEN_SECRET`, generate a random string:

**Option 1: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2: Use any random string generator**
- Example: `my-super-secret-key-12345-abcdef`

#### 3.3 Verify Configuration

Create a checklist to verify your `.env.local`:

- [ ] `NEXT_PUBLIC_QBO_CLIENT_ID` - Filled with your Client ID
- [ ] `QBO_CLIENT_SECRET` - Filled with your Client Secret
- [ ] `NEXT_PUBLIC_QBO_ENVIRONMENT` - Set to `sandbox` or `production`
- [ ] `NEXT_PUBLIC_QBO_REDIRECT_URI` - Matches your Intuit Developer Portal
- [ ] `QBO_TOKEN_SECRET` - Random secret string
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

---

### Step 4: Install Dependencies & Run

#### 4.1 Install Node Modules

```bash
# Navigate to project directory
cd c:\Users\suniel\Downloads\QBO_BANK_ENTRY\QBO_BANK_ENTRY

# Install dependencies
npm install
```

#### 4.2 Run the Application

```bash
# Start development server
npm run dev
```

The application will start at: `http://localhost:3000`

#### 4.3 Test QuickBooks Connection

1. Open `http://localhost:3000` in your browser
2. Click **"Connect to QuickBooks"**
3. Sign in with your QuickBooks account
4. Authorize the app
5. You should be redirected back with a success message

---

## 🌐 Production Deployment Options

### Option 1: Vercel (Recommended - Easiest)

Vercel makes it extremely easy to deploy and manage multiple instances.

#### Setup Steps:

1. **Push Code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/finza.git
   git push -u origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click **"Import Project"**
   - Select your GitHub repository
   - Click **"Import"**

3. **Configure Environment Variables**:
   - In Vercel dashboard, go to **"Settings"** > **"Environment Variables"**
   - Add all variables from your `.env.local` file
   - **Important**: Update `NEXT_PUBLIC_QBO_REDIRECT_URI` to your Vercel URL:
     ```
     https://your-app.vercel.app/api/auth/qbo/callback
     ```

4. **Update QuickBooks Redirect URI**:
   - Go back to Intuit Developer Portal
   - Add your Vercel URL to Redirect URIs:
     ```
     https://your-app.vercel.app/api/auth/qbo/callback
     ```

5. **Deploy**:
   - Vercel will automatically deploy
   - Your app will be live at: `https://your-app.vercel.app`

#### For Multiple Entities on Vercel:

1. Create a new Vercel project for each entity
2. Point each project to the same GitHub repository
3. Configure unique environment variables for each project
4. Each entity gets their own URL: `https://entity1.vercel.app`, `https://entity2.vercel.app`

> [!TIP]
> You can also use custom domains for each entity (e.g., `finza.acmecorp.com`)

---

### Option 2: Netlify (Great for Static Sites)

Netlify provides excellent Next.js support with automatic deployments and serverless functions.

#### Setup Steps:

1. **Push Code to GitHub** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/finza.git
   git push -u origin main
   ```

2. **Deploy to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Click **"Add new site"** > **"Import an existing project"**
   - Select **"GitHub"** and authorize Netlify
   - Choose your repository

3. **Configure Build Settings**:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - Click **"Show advanced"** and add build environment variables

4. **Add Environment Variables**:
   - In Netlify dashboard, go to **"Site settings"** > **"Environment variables"**
   - Add all variables from your `.env.local` file:
     ```
     NEXT_PUBLIC_QBO_CLIENT_ID=your_client_id
     QBO_CLIENT_SECRET=your_client_secret
     NEXT_PUBLIC_QBO_ENVIRONMENT=production
     NEXT_PUBLIC_QBO_REDIRECT_URI=https://your-site.netlify.app/api/auth/qbo/callback
     QBO_TOKEN_SECRET=your_random_secret
     NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     ```

5. **Update QuickBooks Redirect URI**:
   - Go to Intuit Developer Portal
   - Add your Netlify URL to Redirect URIs:
     ```
     https://your-site.netlify.app/api/auth/qbo/callback
     ```

6. **Deploy**:
   - Click **"Deploy site"**
   - Netlify will build and deploy automatically
   - Your app will be live at: `https://your-site.netlify.app`

#### For Multiple Entities on Netlify:

1. Create a new Netlify site for each entity
2. Point each site to the same GitHub repository
3. Configure unique environment variables for each site
4. Each entity gets their own URL: `https://entity1.netlify.app`, `https://entity2.netlify.app`

> [!TIP]
> You can use custom domains for each entity (e.g., `finza.acmecorp.com`) in Netlify's domain settings.

---

### Option 3: Manual Deployment (VPS/Cloud Server)

If you prefer to deploy on your own server:

1. **Build the Application**:
   ```bash
   npm run build
   ```

2. **Start Production Server**:
   ```bash
   npm start
   ```

3. **Use PM2 for Process Management** (recommended):
   ```bash
   npm install -g pm2
   pm2 start npm --name "finza" -- start
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx as Reverse Proxy**:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 📝 Quick Reference Checklist

Use this checklist when setting up for a new entity:

### For Each New Entity:

- [ ] **QuickBooks Setup**
  - [ ] Create new app in Intuit Developer Portal
  - [ ] Configure redirect URI
  - [ ] Copy Client ID and Client Secret
  - [ ] Add production redirect URI (if deploying)

- [ ] **Supabase Setup**
  - [ ] Create new Supabase project
  - [ ] Copy Project URL and API keys
  - [ ] Deploy database schema
  - [ ] Verify tables created

- [ ] **Environment Configuration**
  - [ ] Create `.env.local` file
  - [ ] Fill in QuickBooks credentials
  - [ ] Fill in Supabase credentials
  - [ ] Generate token secret
  - [ ] Verify all values

- [ ] **Testing**
  - [ ] Run `npm install`
  - [ ] Run `npm run dev`
  - [ ] Test QuickBooks connection
  - [ ] Test bank entry workflow
  - [ ] Test rules engine

- [ ] **Production Deployment** (if applicable)
  - [ ] Deploy to Vercel/VPS
  - [ ] Configure production environment variables
  - [ ] Update QuickBooks redirect URI
  - [ ] Test production connection

---

## 🔧 Troubleshooting

### Issue: "Invalid Client ID"

**Solution**: 
- Verify you copied the correct Client ID from Intuit Developer Portal
- Ensure you're using Development keys for sandbox, Production keys for production
- Check that `NEXT_PUBLIC_QBO_ENVIRONMENT` matches your key type

### Issue: "Redirect URI Mismatch"

**Solution**:
- Ensure `NEXT_PUBLIC_QBO_REDIRECT_URI` in `.env.local` exactly matches the URI in Intuit Developer Portal
- Check for trailing slashes (should not have one)
- Verify protocol (http vs https)

### Issue: "Supabase Connection Error"

**Solution**:
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check that API keys are copied completely (they're very long)
- Ensure database schema was deployed successfully

### Issue: "No Bank Accounts Found"

**Solution**:
- Verify QuickBooks connection is active
- Check that the QuickBooks company has bank accounts set up
- Try disconnecting and reconnecting QuickBooks

---

## 💡 Best Practices

### Security

1. **Never commit `.env.local` to Git**
   - Add it to `.gitignore` (already done in this project)
   
2. **Rotate secrets regularly**
   - Change `QBO_TOKEN_SECRET` periodically
   - Regenerate Supabase keys if compromised

3. **Use production keys only in production**
   - Keep sandbox and production credentials separate

### Data Management

1. **Regular backups**
   - Supabase provides automatic backups
   - Consider exporting rules and configurations

2. **Test in sandbox first**
   - Always test new features in QuickBooks sandbox
   - Verify rules before applying to production data

### User Management

1. **Assign appropriate roles**
   - Use "Admin" role sparingly
   - Most users should be "Coworker" role

2. **Document entity-specific configurations**
   - Keep a record of which QuickBooks companies are connected
   - Note any custom rules or configurations

---

## 📞 Support

If you encounter issues during setup:

1. Check the troubleshooting section above
2. Review the [QuickBooks API documentation](https://developer.intuit.com/app/developer/qbo/docs/get-started)
3. Review the [Supabase documentation](https://supabase.com/docs)
4. Check application logs for error messages

---

## 🎉 You're All Set!

Once you've completed this setup, your team member will have:
- ✅ Their own QuickBooks integration
- ✅ Their own isolated database
- ✅ Full access to all application features
- ✅ Complete data privacy and security

Repeat this process for each new entity or team member that needs access to the application.
