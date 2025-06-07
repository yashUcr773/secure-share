# Email Service Configuration

## Overview

SecureShare uses SendGrid for production email delivery. The email service handles:

- Email verification during user registration
- Password reset emails
- Login notification emails (optional security feature)

## Environment Variables

Add these environment variables to your production environment:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

## SendGrid Setup

1. **Create SendGrid Account**
   - Sign up at [sendgrid.com](https://sendgrid.com)
   - Verify your email address

2. **Create API Key**
   - Go to Settings > API Keys
   - Click "Create API Key"
   - Choose "Restricted Access" 
   - Grant "Mail Send" permissions
   - Copy the API key (store securely - it's only shown once)

3. **Verify Sender Domain**
   - Go to Settings > Sender Authentication
   - Verify your domain or single sender email
   - This prevents emails from going to spam

4. **Configure Environment Variables**
   ```bash
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   ```

## Development vs Production

### Development
- Emails are logged to console instead of sent
- No external dependencies required
- All email functionality can be tested locally

### Production
- Real emails sent via SendGrid
- Requires valid API key and verified sender
- Full delivery tracking and analytics available

## Email Templates

The service includes professionally designed HTML email templates:

### Verification Email
- Clean, branded design
- Security notices and best practices
- Mobile-responsive layout
- Clear call-to-action button

### Password Reset Email
- Security-focused messaging
- Time-sensitive warnings
- Prevention of social engineering
- Alternative text link for accessibility

### Login Notification (Optional)
- Security monitoring
- Device and location details
- Instructions for compromised accounts

## Testing Email Service

### Local Testing
```bash
npm run dev
# Register a new user
# Check console for email output
```

### Production Testing
```bash
# Set environment variables
export SENDGRID_API_KEY=your_key
export SENDGRID_FROM_EMAIL=your_email

# Test in production environment
curl -X POST http://your-domain/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}'
```

## Monitoring and Analytics

SendGrid provides:
- Delivery status tracking
- Open and click rates
- Spam report monitoring
- Bounce and unsubscribe handling

Access these through the SendGrid dashboard.

## Alternative Email Providers

The email service can be easily adapted for other providers:

### Mailgun
```javascript
const mailgun = require('mailgun-js');
const mg = mailgun({apiKey: API_KEY, domain: DOMAIN});
```

### AWS SES
```javascript
const AWS = require('aws-sdk');
const ses = new AWS.SES({region: 'us-east-1'});
```

### Nodemailer (SMTP)
```javascript
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  service: 'gmail', // or your SMTP provider
  auth: { user: EMAIL, pass: PASSWORD }
});
```

## Security Considerations

1. **API Key Security**
   - Never commit API keys to version control
   - Use environment variables or secret management
   - Rotate keys regularly

2. **Rate Limiting**
   - SendGrid has built-in rate limiting
   - Monitor usage to prevent abuse
   - Consider additional application-level limits

3. **Email Validation**
   - Validate email formats before sending
   - Handle bounces and invalid addresses
   - Implement unsubscribe mechanisms

4. **SPAM Prevention**
   - Use verified sender domains
   - Include proper headers and authentication
   - Monitor reputation scores

## Troubleshooting

### Common Issues

1. **Emails go to spam**
   - Verify sender domain in SendGrid
   - Check SPF/DKIM records
   - Improve email content and formatting

2. **API key errors**
   - Verify key is correct and active
   - Check API key permissions
   - Ensure key hasn't been rotated

3. **Delivery failures**
   - Check SendGrid activity logs
   - Verify recipient email addresses
   - Monitor bounce rates

### Debug Mode

Enable debug logging in development:

```javascript
process.env.SENDGRID_DEBUG = 'true';
```

This provides detailed information about email sending attempts.

## Cost Considerations

SendGrid pricing (as of 2025):
- Free tier: 100 emails/day
- Essentials: $19.95/month for 50,000 emails
- Pro: $89.95/month for 100,000 emails

Monitor usage to choose appropriate plan for your application's needs.
