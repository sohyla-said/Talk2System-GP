# import os
# import smtplib
# from email.mime.text import MIMEText
# from email.mime.multipart import MIMEMultipart

# SMTP_HOST    = os.getenv("SMTP_HOST", "smtp.gmail.com")
# SMTP_PORT    = int(os.getenv("SMTP_PORT", "587"))
# SMTP_USER    = os.getenv("SMTP_USER", "")
# SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
# FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


# def send_invitation_email(
#     to_email: str,
#     inviter_name: str,
#     project_name: str,
#     project_domain: str,
#     notes: str = None,
# ):
#     # dev mode — no SMTP configured, just print
#     if not SMTP_USER or not SMTP_PASSWORD:
#         print(f"[DEV] Invite email → {to_email} | project='{project_name}' | domain='{project_domain}'")
#         return

#     subject = f"You've been invited to join '{project_name}' on Talk2System"
#     notes_block = f"<p><b>Message:</b> {notes}</p>" if notes else ""

#     html = f"""
#     <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;">
#       <h2 style="color:#5b4fcf;">You have been invited!</h2>
#       <p><b>{inviter_name}</b> invited you to join <b>{project_name}</b>
#          (domain: {project_domain}) on Talk2System.</p>
#       {notes_block}
#       <a href="{FRONTEND_URL}/signup"
#          style="display:inline-block;margin-top:16px;padding:12px 28px;
#                 background:#5b4fcf;color:#fff;border-radius:8px;
#                 text-decoration:none;font-weight:bold;">
#         Accept &amp; Sign Up
#       </a>
#       <p style="margin-top:24px;color:#888;font-size:12px;">
#         Already have an account? Log in and search for <b>{project_name}</b>
#         to send a join request.
#       </p>
#     </div>
#     """

#     msg = MIMEMultipart("alternative")
#     msg["Subject"] = subject
#     msg["From"]    = SMTP_USER
#     msg["To"]      = to_email
#     msg.attach(MIMEText(html, "html"))

#     try:
#         with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
#             server.starttls()
#             server.login(SMTP_USER, SMTP_PASSWORD)
#             server.sendmail(SMTP_USER, to_email, msg.as_string())
#     except Exception as e:
#         print(f"[EMAIL ERROR] Failed to send to {to_email}: {e}")