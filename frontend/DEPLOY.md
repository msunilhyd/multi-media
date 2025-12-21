# Frontend Deployment (Vercel)

## Prerequisites
- Vercel account (https://vercel.com)
- GitHub repo with this code

## Deploy Steps

### 1. Import Project
1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Set root directory to `multi-media/frontend`

### 2. Set Environment Variables
In Vercel Project Settings → Environment Variables:
```
NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app
```

### 3. Deploy
Vercel auto-deploys on push to main branch.

### 4. Custom Domain Setup
1. In Vercel: Settings → Domains → Add `linusplaylists.com`
2. In GoDaddy DNS, add these records:
   - Type: A, Name: @, Value: 76.76.21.21
   - Type: CNAME, Name: www, Value: cname.vercel-dns.com

Your site will be live at: https://www.linusplaylists.com
