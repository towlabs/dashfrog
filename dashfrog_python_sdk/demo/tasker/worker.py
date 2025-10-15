import time

from celery import Celery
from celery.canvas import group
from celery.schedules import crontab
from celery.signals import worker_process_init

from dashfrog_python_sdk import DashFrog

from .models import SessionLocal, Ticket, TicketStatus, User

# Configuration Celery
celery = Celery("tasker", broker="redis://0.0.0.0:6379")

celery.conf.result_backend = "redis://0.0.0.0:6379"

# Configuration Celery Beat pour les tâches planifiées
celery.conf.beat_schedule = {
    "check-in-progress-tickets-daily": {
        "task": "check_in_progress_tickets",
        "schedule": crontab(hour="*/2", minute="0"),  # Tous les jours à 9h00
        # Pour tester toutes les minutes : "schedule": crontab(minute="*")
    },
    "send-weekly-summary": {
        "task": "send_weekly_ticket_summary",
        "schedule": crontab(hour="*/5", minute="10"),  # Tous les lundis à 10h00
    },
}

celery.conf.timezone = "UTC"

dashfrog = DashFrog("demo.tasker.celery")


@worker_process_init.connect(weak=False)
def init_worker(sender, **kwargs):
    """Initialize DashFrog instrumentation when worker starts"""
    dashfrog.with_celery()


@celery.task(name="update_user_info_on_tickets")
def update_user_info_on_tickets(user_id: int):
    """
    Update cached user information (display_name, avatar) on all tickets
    where the user is creator or assignee.

    This task is triggered when a user updates their profile.
    """

    with dashfrog.current_flow():
        with dashfrog.current_step():
            db = SessionLocal()
            try:
                with dashfrog.step("fetch_user"):
                    # Get updated user info
                    user = db.query(User).filter(User.id == user_id).first()
                    if not user:
                        return {
                            "status": "error",
                            "message": f"User {user_id} not found",
                        }

                with dashfrog.step("update_tickets_as_creator"):
                    # Update tickets where user is creator
                    creator_tickets = db.query(Ticket).filter(Ticket.creator_id == user_id).all()
                    for ticket in creator_tickets:
                        ticket.creator_display_name = user.display_name
                        ticket.creator_avatar = user.avatar

                with dashfrog.step("update_tickets_as_assignee"):
                    # Update tickets where user is assignee
                    assignee_tickets = db.query(Ticket).filter(Ticket.assignee_id == user_id).all()
                    for ticket in assignee_tickets:
                        ticket.assignee_display_name = user.display_name
                        ticket.assignee_avatar = user.avatar

                with dashfrog.step("commit_changes"):
                    db.commit()
                    total_updated = len(creator_tickets) + len(assignee_tickets)

                return {
                    "status": "success",
                    "user_id": user_id,
                    "tickets_updated": total_updated,
                    "as_creator": len(creator_tickets),
                    "as_assignee": len(assignee_tickets),
                }

            except Exception:
                db.rollback()
                raise
            finally:
                db.close()


@celery.task(name="send_ticket_notification")
def send_ticket_notification(ticket_id: int, action: str):
    """
    Send notification when ticket is created or updated.
    This is a demo task to show multiple Celery tasks.
    """
    with dashfrog.current_flow():
        with dashfrog.current_step():
            with dashfrog.step("prepare_notification"):
                time.sleep(0.5)  # Simulate preparation

            with dashfrog.step("send_email"):
                time.sleep(0.5)  # Simulate sending

    return {"status": "sent", "ticket_id": ticket_id, "action": action}


@celery.task(name="send_email_to_user")
def send_email_to_user(user_email: str, subject: str, body: str, close: bool = True):
    """
    Send email to a user.
    In production, this would use a real email service (SendGrid, AWS SES, etc.)
    """
    with dashfrog.current_flow(auto_end=close):
        with dashfrog.current_step(auto_end=close):
            with dashfrog.step("connect_to_smtp"):
                # Simulate SMTP connection
                time.sleep(0.2)

            with dashfrog.step("send_message"):
                # In production: send actual email
                # For demo: just log it
                print(f"\n{'=' * 60}")
                print("📧 EMAIL SENT")
                print(f"{'=' * 60}")
                print(f"To: {user_email}")
                print(f"Subject: {subject}")
                print(f"\n{body}")
                print(f"{'=' * 60}\n")
                time.sleep(0.3)

    return {"status": "sent", "to": user_email, "subject": subject}


@celery.task(name="check_in_progress_tickets")
def check_in_progress_tickets():
    """
    Scheduled task that runs daily to check all tickets in progress
    and send reminder emails to assignees.

    Scheduled to run every day at 9:00 AM UTC.
    """
    with dashfrog.flow("check_in_progress_tickets_cron"):
        db = SessionLocal()
        try:
            with dashfrog.step("fetch_in_progress_tickets"):
                # Get all tickets with status IN_PROGRESS
                in_progress_tickets = (
                    db.query(Ticket)
                    .filter(Ticket.status == TicketStatus.IN_PROGRESS)
                    .filter(Ticket.assignee_id.isnot(None))
                    .all()
                )

                print(f"Found {len(in_progress_tickets)} tickets in progress")

            # Group tickets by assignee
            tickets_by_user = {}
            for ticket in in_progress_tickets:
                assignee = db.query(User).filter(User.id == ticket.assignee_id).first()
                if assignee:
                    if assignee.id not in tickets_by_user:
                        tickets_by_user[assignee.id] = {
                            "user": assignee,
                            "tickets": [],
                        }
                    tickets_by_user[assignee.id]["tickets"].append(ticket)

            with dashfrog.step("send_reminder_emails"):
                emails_sent = 0
                mail_tasks = []
                for user_id, data in tickets_by_user.items():
                    user = data["user"]
                    tickets = data["tickets"]

                    # Build email body
                    subject = f"Reminder: You have {len(tickets)} ticket(s) in progress"
                    body = f"Hello {user.display_name},\n\n"
                    body += f"This is a reminder that you have {len(tickets)} ticket(s) currently in progress:\n\n"

                    for ticket in tickets:
                        days_open = (ticket.updated_at - ticket.created_at).days
                        body += f"  • #{ticket.id}: {ticket.title}\n"
                        body += f"    Status: {ticket.status}\n"
                        body += f"    Days since last update: {days_open}\n\n"

                    body += "Please review and update these tickets.\n\n"
                    body += "Best regards,\nTasker Team"

                    # Send email asynchronously
                    mail_tasks.append(send_email_to_user.s(user.email, subject, body, close=False))

                    emails_sent += 1

                res = group(mail_tasks).apply_async()

                while not res.ready() and (not res.successful() or not res.failed()):
                    time.sleep(0.1)

                if not res.successful():
                    raise Exception("Failed to send emails")

            return {
                "status": "success",
                "tickets_checked": len(in_progress_tickets),
                "users_notified": emails_sent,
                "details": {user_id: len(data["tickets"]) for user_id, data in tickets_by_user.items()},
            }

        finally:
            db.close()


@celery.task(name="send_weekly_ticket_summary")
def send_weekly_ticket_summary():
    """
    Send weekly summary of ticket statistics to all users.

    Scheduled to run every Monday at 10:00 AM UTC.
    """
    with dashfrog.flow("send_weekly_summary_cron", auto_end=False):
        db = SessionLocal()
        try:
            with dashfrog.step("gather_statistics"):
                # Get statistics
                total_tickets = db.query(Ticket).count()
                open_tickets = db.query(Ticket).filter(Ticket.status == TicketStatus.OPEN).count()
                in_progress_tickets = db.query(Ticket).filter(Ticket.status == TicketStatus.IN_PROGRESS).count()
                resolved_tickets = db.query(Ticket).filter(Ticket.status == TicketStatus.RESOLVED).count()
                closed_tickets = db.query(Ticket).filter(Ticket.status == TicketStatus.CLOSED).count()

                stats = {
                    "total": total_tickets,
                    "open": open_tickets,
                    "in_progress": in_progress_tickets,
                    "resolved": resolved_tickets,
                    "closed": closed_tickets,
                }

            with dashfrog.step("send_summary_to_all_users"):
                users = db.query(User).all()

                mail_tasks = []
                for user in users:
                    # Get user-specific stats
                    user_created = db.query(Ticket).filter(Ticket.creator_id == user.id).count()
                    user_assigned = (
                        db.query(Ticket)
                        .filter(Ticket.assignee_id == user.id)
                        .filter(Ticket.status != TicketStatus.CLOSED)
                        .count()
                    )

                    # Build email
                    subject = "Weekly Ticket Summary"
                    body = f"Hello {user.display_name},\n\n"
                    body += "Here's your weekly ticket summary:\n\n"
                    body += "📊 Overall Statistics:\n"
                    body += f"  • Total tickets: {stats['total']}\n"
                    body += f"  • Open: {stats['open']}\n"
                    body += f"  • In Progress: {stats['in_progress']}\n"
                    body += f"  • Resolved: {stats['resolved']}\n"
                    body += f"  • Closed: {stats['closed']}\n\n"
                    body += "👤 Your Statistics:\n"
                    body += f"  • Tickets you created: {user_created}\n"
                    body += f"  • Tickets assigned to you (active): {user_assigned}\n\n"
                    body += "Have a great week!\n\n"
                    body += "Best regards,\nTasker Team"

                    mail_tasks.append(send_email_to_user.s(user.email, subject, body, close=False))

                res = group(mail_tasks).apply_async()

                while not res.ready() and (not res.successful() or not res.failed()):
                    time.sleep(0.1)

                if not res.successful():
                    raise Exception("Failed to send emails")
            return {
                "status": "success",
                "users_notified": len(users),
                "statistics": stats,
            }

        finally:
            db.close()
