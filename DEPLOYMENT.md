# Café POS - Deployment Guide

## 🚀 Deploy to Railway

### Quick Start:

1. **Go to**: https://railway.app
2. **Sign in with GitHub** (IsmailSellami)
3. **Create new project** → Select **Deploy from GitHub**
4. **Choose repository**: `cafe-pos-app`
5. **Wait for Railway to auto-detect** the Node.js app

### Configuration:

After Railway detects your repo:

1. **Click "Add Service"** → Choose **PostgreSQL**
2. **Set Environment Variables:**
   - Go to **Variables** section
   - Add:
     ```
     DATABASE_URL = [PostgreSQL connection string from Railway]
     SESSION_SECRET = your-random-secret-key-here
     PORT = 4000
     ```

3. **Optional - Connect your Supabase:**
   - If using external Supabase:
     ```
     SUPABASE_URL = https://your-project.supabase.co
     SUPABASE_KEY = your-publishable-key
     ```

4. **Deploy** → Click the **Deploy** button

### Get Your Public URL:

After deployment, Railway will provide a public URL like:
```
https://cafe-pos-app-production.railway.app
```

---

## 📝 Environment Variables Explained:

- **DATABASE_URL**: PostgreSQL connection string (Railway provides this)
- **SESSION_SECRET**: Random string for session encryption (generate your own)
- **PORT**: Server port (Railway uses dynamic port)

---

## ✅ Testing Your Deployment:

1. Go to your public URL
2. Login with your credentials
3. Test the welcome notification
4. Check that tables/receipts work

---

## 🆘 Troubleshooting:

**"Database not connected"?**
- Check DATABASE_URL in Railway variables
- Ensure PostgreSQL service is running

**"Blank page"?**
- Check browser console for errors
- Check Railway logs for backend errors

**"Session not working"?**
- Verify SESSION_SECRET is set
- Clear browser cookies and retry

---

## 🔗 Useful Links:

- Railway Dashboard: https://railway.app/dashboard
- GitHub Repo: https://github.com/IsmailSellami/cafe-pos-app
- Railway Docs: https://docs.railway.app

---

**Need help?** Check Railway's documentation or contact support.
