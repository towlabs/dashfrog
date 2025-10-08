from celery import Celery
from celery.signals import worker_process_init

from dashfrog_python_sdk import DashFrog

from .models import SessionLocal, Ticket, User

# Configuration Celery
celery = Celery("tasker", broker="redis://0.0.0.0:6379")
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
    db = SessionLocal()
    try:
        with dashfrog.step("fetch_user"):
            # Get updated user info
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return {"status": "error", "message": f"User {user_id} not found"}

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
        dashfrog.steps.end()
        dashfrog.flows.end()
        db.close()


@celery.task(name="send_ticket_notification")
def send_ticket_notification(ticket_id: int, action: str):
    """
    Send notification when ticket is created or updated.
    This is a demo task to show multiple Celery tasks.
    """

    # Simulate sending email/notification
    import time

    with dashfrog.step("prepare_notification"):
        time.sleep(0.5)  # Simulate preparation

    with dashfrog.step("send_email"):
        time.sleep(0.5)  # Simulate sending

    dashfrog.steps.end()
    dashfrog.flows.end()
    return {"status": "sent", "ticket_id": ticket_id, "action": action}
