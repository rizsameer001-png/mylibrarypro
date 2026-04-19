# LMS Server — Node.js / Express / MongoDB
netstat -ano | findstr :3000
taskkill /PID <PID> /F
taskkill /PID 16364 /F

## Quick Start
Admin@123 

```bash
cp .env.example .env        # fill in your values
npm install
npm run seed                 # seed database with sample data
npm run dev                  # start with nodemon
```

## Default Credentials (after seed)
| Role    | Email                   | Password    |
|---------|-------------------------|-------------|
| Admin   | admin@library.com       | Admin@123   |
| Manager | manager@library.com     | Manager@123 |
| Member  | member@library.com      | Member@123  |
📋 Login Credentials:
  Admin:   admin@library.com   / Admin@123
  Manager: manager@library.com / Manager@123
  Member:  member@library.com  / Member@123


## API Base URL
`http://localhost:5000/api`

## Endpoints

| Module          | Base Path              |
|-----------------|------------------------|
| Auth            | /api/auth              |
| Users           | /api/users             |
| Books           | /api/books             |
| Categories      | /api/categories        |
| Authors         | /api/authors           |
| Publishers      | /api/publishers        |
| Circulation     | /api/circulation       |
| Memberships     | /api/memberships       |
| Penalties       | /api/penalties         |
| Notifications   | /api/notifications     |
| Reports         | /api/reports           |
| CMS             | /api/cms               |
| Dashboard       | /api/dashboard         |

## Tech Stack
- **Runtime**: Node.js + Express
- **Database**: MongoDB + Mongoose
- **Auth**: JWT + bcryptjs
- **Files**: Multer
- **Email**: Nodemailer
- **Excel**: xlsx
- **Scheduling**: node-cron
- **Push Notifications**: Firebase Admin SDK
