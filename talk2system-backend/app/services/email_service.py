import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


class EmailService:
    def __init__(self):
        self.host = os.getenv("EMAIL_HOST", "smtp.gmail.com")
        self.port = int(os.getenv("EMAIL_PORT", "587"))
        self.use_tls = os.getenv("EMAIL_USE_TLS", "true").lower() == "true"
        self.username = os.getenv("EMAIL_USER")
        self.password = os.getenv("EMAIL_PASS")
        self.from_name = os.getenv("APP_NAME", "Talk2System")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    def _connect(self):
        server = smtplib.SMTP(self.host, self.port)
        if self.use_tls:
            server.starttls()
        if self.username and self.password:
            server.login(self.username, self.password)
        return server

    def send_password_reset(self, to_email: str, user_name: str, token: str) -> bool:
        try:
            reset_url = f"{self.frontend_url}/reset-password?token={token}"

            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Password Reset Request"
            msg["From"] = f"{self.from_name} <{self.username}>"
            msg["To"] = to_email

            html = f"""
            <div style="max-width:480px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;">
              <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px;border-radius:16px 16px 0 0;text-align:center;">
                <h1 style="color:white;margin:0;font-size:24px;">Password Reset</h1>
              </div>
              <div style="background:white;padding:32px;border-radius:0 0 16px 16px;border:1px solid #e5e7eb;">
                <p style="color:#374151;font-size:16px;margin-bottom:24px;">
                  Hello {user_name or "there"},<br><br>
                  We received a request to reset your password. Click the button below:
                </p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="{reset_url}" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">
                    Reset Password
                  </a>
                </div>
                <p style="color:#6b7280;font-size:14px;">
                  Or copy this link:<br>
                  <a href="{reset_url}" style="color:#667eea;word-break:break-all;">{reset_url}</a>
                </p>
                <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;margin-top:24px;border-radius:4px;">
                  <p style="color:#92400e;font-size:13px;margin:0;">
                    This link expires in 1 hour. If you didn't request this, ignore this email.
                  </p>
                </div>
              </div>
              <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">
                &copy; {datetime.now().year} {self.from_name}. All rights reserved.
              </p>
            </div>
            """
            msg.attach(MIMEText(html, "html"))

            server = self._connect()
            server.sendmail(self.username, to_email, msg.as_string())
            server.quit()
            return True
        except Exception as e:
            print(f"Failed to send reset email: {e}")
            return False

    def send_reset_confirmation(self, to_email: str, user_name: str) -> bool:
        try:
            login_url = f"{self.frontend_url}/login"

            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Password Successfully Reset"
            msg["From"] = f"{self.from_name} <{self.username}>"
            msg["To"] = to_email

            html = f"""
            <div style="max-width:480px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;">
              <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:32px;border-radius:16px 16px 0 0;text-align:center;">
                <h1 style="color:white;margin:0;font-size:24px;">&#10003; Password Updated</h1>
              </div>
              <div style="background:white;padding:32px;border-radius:0 0 16px 16px;border:1px solid #e5e7eb;">
                <p style="color:#374151;font-size:16px;">
                  Hello {user_name or "there"},<br><br>
                  Your password has been successfully reset. You can now log in with your new password.
                </p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="{login_url}" style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">
                    Go to Login
                  </a>
                </div>
              </div>
            </div>
            """
            msg.attach(MIMEText(html, "html"))

            server = self._connect()
            server.sendmail(self.username, to_email, msg.as_string())
            server.quit()
            return True
        except Exception as e:
            print(f"Failed to send confirmation email: {e}")
            return False


email_service = EmailService()