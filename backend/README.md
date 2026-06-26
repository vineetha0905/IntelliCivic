# IntelliCivic Backend API

A comprehensive Node.js/Express backend for the IntelliCivic civic issue reporting platform.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with OTP verification

## 🧭 Implementation Flow (Non-Technical)

1. Citizen registers with Name, Aadhaar (12 digits), Mobile (10 digits), and Address (or uses current location to autofill).
2. For login, citizen enters Aadhaar and receives a one‑time password (OTP).
3. Citizen enters the OTP; if correct and on time, access is granted.
4. If the mobile/Aadhaar was seen before, the existing account is upgraded with the new details instead of being blocked.
5. Admins use their own login to view, assign, and track issue resolutions.

- **Issue Management**: Create, update, track civic issues with location data
- **Real-time Updates**: Socket.io for live notifications
- **File Upload**: Cloudinary integration for images and documents
- **Admin Dashboard**: Complete admin panel with analytics
- **Notifications**: Email and in-app notifications
- **Multi-language Support**: Ready for internationalization
- **Security**: Rate limiting, CORS, input validation
- **Database**: MongoDB with Mongoose ODM

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Cloudinary account (for file uploads)
- SMTP credentials (for email notifications)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/intellicivic
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   
   # Email
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | User login |
| POST | `/auth/send-otp` | Send OTP to mobile/email |
| POST | `/auth/verify-otp` | Verify OTP |
| POST | `/auth/guest` | Guest login |
| POST | `/auth/admin-login` | Admin login |
| GET | `/auth/profile` | Get user profile |
| PUT | `/auth/profile` | Update profile |

### Issue Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/issues` | Get all issues (with filters) |
| POST | `/issues` | Create new issue |
| GET | `/issues/:id` | Get specific issue |
| PUT | `/issues/:id` | Update issue |
| DELETE | `/issues/:id` | Delete issue |
| POST | `/issues/:id/upvote` | Upvote issue |
| GET | `/issues/nearby` | Get nearby issues |
| GET | `/issues/:id/comments` | Get issue comments |
| POST | `/issues/:id/comments` | Add comment |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | Admin dashboard stats |
| GET | `/admin/analytics` | Analytics data |
| PUT | `/admin/issues/:id/assign` | Assign issue |
| PUT | `/admin/issues/:id/status` | Update issue status |
| GET | `/admin/users` | Get all users |
| PUT | `/admin/users/:id/status` | Update user status |

### Upload Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload/image` | Upload single image |
| POST | `/upload/images` | Upload multiple images |
| POST | `/upload/document` | Upload document |
| POST | `/upload/mixed` | Upload mixed files |
| DELETE | `/upload/:publicId` | Delete file |

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/intellicivic |
| `JWT_SECRET` | JWT secret key | - |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | - |
| `SMTP_HOST` | SMTP server | smtp.gmail.com |
| `CORS_ORIGIN` | Allowed origins | http://localhost:3000 |

### Database Models

#### User
- Authentication and profile information
- Role-based access (citizen, admin, guest)
- OTP verification system

#### Issue
- Civic issue reports with location data
- Status tracking and assignment
- File attachments and comments

#### Comment
- Issue discussions and updates
- Admin and citizen comments
- Like system

#### Notification
- Real-time notifications
- Email and in-app notifications
- Multi-channel delivery

## 🚀 Deployment

### Using PM2 (Recommended)

1. **Install PM2**
   ```bash
   npm install -g pm2
   ```

2. **Create ecosystem file**
   ```bash
   # ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'intellicivic-api',
       script: 'server.js',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 5000
       }
     }]
   };
   ```

3. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   ```

### Using Docker

1. **Create Dockerfile**
   ```dockerfile
   FROM node:16-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 5000
   CMD ["npm", "start"]
   ```

2. **Build and run**
   ```bash
   docker build -t intellicivic-api .
   docker run -p 5000:5000 intellicivic-api
   ```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:5000/health
```

### Logs
- Development: Console logs with Morgan
- Production: Winston logging to files

## 🔒 Security Features

- **Rate Limiting**: Prevent API abuse
- **CORS**: Cross-origin resource sharing
- **Helmet**: Security headers
- **Input Validation**: Joi validation
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt encryption

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@intellicivic.com or create an issue in the repository.

---

**IntelliCivic Backend API** - Empowering communities through technology 🚀
