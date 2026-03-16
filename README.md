# Finza - QuickBooks Bank Entry Application

A comprehensive QuickBooks Online integration for automated bank entry processing with intelligent transaction mapping and rules engine.

## ✨ Features

- 🔐 **QuickBooks OAuth Integration** - Secure connection to QuickBooks Online
- 🏢 **Multi-Company Support** - Manage multiple QuickBooks companies
- 📊 **Real-time Dashboard** - Live financial KPIs and charts
- 📁 **CSV/PDF Bank Statement Upload** - Easy import of bank transactions
- 🤖 **n8n Integration** - Automated PDF parsing and transaction pushing
- ⚙️ **Intelligent Rules Engine** - Automated transaction categorization
- 👥 **User Management** - Admin and coworker role-based access
- 🌓 **Dark/Light Mode** - Beautiful UI with theme toggle

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- QuickBooks Online account
- Supabase account (free tier works)
- Intuit Developer account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd QBO_BANK_ENTRY
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.template` to `.env.local`
   - Fill in your QuickBooks, Supabase, and n8n credentials
   - See [Multi-Tenant Setup Guide](./SETUP_GUIDE.md) for detailed instructions

4. **Run the application**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📚 Documentation

- **[Multi-Tenant Setup Guide](./SETUP_GUIDE.md)** - Complete guide for setting up multiple instances
- **[Supabase Schema](./supabase_schema.sql)** - Database schema for Supabase

## 🔧 Configuration

### QuickBooks Setup

1. Go to [developer.intuit.com](https://developer.intuit.com)
2. Create a new app
3. Get your Client ID and Client Secret
4. Add redirect URI: `http://localhost:3000/api/auth/qbo/callback`

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your Project URL and API keys
3. Run the SQL schema from `supabase_schema.sql`

## 🏗️ Project Structure

```
QBO_BANK_ENTRY/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Dashboard page
│   │   ├── bank-entry/   # Bank entry workflow
│   │   └── rules/        # Rules engine
│   ├── components/       # React components
│   │   ├── ui/           # UI components
│   │   ├── bank-entries/ # Bank entry components
│   │   └── rules/        # Rules components
│   └── lib/              # Utility libraries
│       ├── qbo.ts        # QuickBooks API client
│       └── supabase.ts   # Supabase client
├── scripts/              # Debug, test, and migration tools
├── .env.local            # Environment variables (not in git)
├── .env.template         # Environment template
├── supabase_schema.sql   # Database schema
```

## 🌐 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

See the [Multi-Tenant Setup Guide](./SETUP_GUIDE.md) for detailed deployment instructions.

## 🔒 Security

- Never commit `.env.local` to version control
- Keep your QuickBooks Client Secret secure
- Use production keys only in production
- Rotate secrets regularly

## 📝 License

Private - All rights reserved

## 🤝 Support

For setup assistance, refer to the [Multi-Tenant Setup Guide](./SETUP_GUIDE.md).
