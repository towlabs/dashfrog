from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from dashfrog_python_sdk import DashFrog

from . import schemas
from .models import Ticket, TicketStatus, User, get_db, init_db
from .worker import celery, send_ticket_notification, update_user_info_on_tickets

# Initialize FastAPI app
app = FastAPI(
    title="Tasker - Ticket Management System",
    description="Demo app with FastAPI, Celery, and DashFrog monitoring",
    version="1.0.0",
)

# Initialize DashFrog
dashfrog = DashFrog("demo.tasker.api")
dashfrog.with_fastapi(app).with_celery()


# Initialize database
init_db()


# ===== USER ENDPOINTS =====


@app.post("/users", response_model=schemas.User, status_code=201)
def create_user(user: schemas.UserCreate, db: Annotated[Session, Depends(get_db)]):
    """Create a new user"""
    with dashfrog.flow("create_user", username=user.username) as flow:
        # Check if user exists
        with flow.step("validate"):
            existing = db.query(User).filter(User.username == user.username).first()
            if existing:
                raise HTTPException(status_code=400, detail="Username already exists")

            existing_email = db.query(User).filter(User.email == user.email).first()
            if existing_email:
                raise HTTPException(status_code=400, detail="Email already exists")

        # Create user

        with flow.step("create"):
            db_user = User(**user.model_dump())
            db.add(db_user)
            db.commit()
            db.refresh(db_user)

        return db_user


@app.get("/users", response_model=list[schemas.User])
def list_users(
    db: Annotated[Session, Depends(get_db)], skip: int = 0, limit: int = 100
):
    """List all users"""

    users = db.query(User).offset(skip).limit(limit).all()
    return users


@app.get("/users/{user_id}", response_model=schemas.User)
def get_user(user_id: int, db: Annotated[Session, Depends(get_db)]):
    """Get user by ID"""
    with dashfrog.flow("get_user", user_id=user_id):
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return user


@app.patch("/users/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    db: Annotated[Session, Depends(get_db)],
):
    """Update user information and trigger Celery task to update tickets"""
    with dashfrog.flow("update_user", auto_end=False, user_id=user_id):
        with dashfrog.step("fetch_user"):
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

        with dashfrog.step("update_fields"):
            # Update user fields
            update_data = user_update.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(user, key, value)

            db.commit()
            db.refresh(user)

        with dashfrog.step("trigger_ticket_update", auto_end=False, auto_start=False):
            # Trigger Celery task to update user info on all tickets
            task = update_user_info_on_tickets.delay(user_id)

        return user


@app.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: Annotated[Session, Depends(get_db)]):
    """Delete a user"""
    with dashfrog.flow("delete_user", user_id=user_id):
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check if user has tickets
        tickets_count = (
            db.query(Ticket)
            .filter((Ticket.creator_id == user_id) | (Ticket.assignee_id == user_id))
            .count()
        )

        if tickets_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete user with {tickets_count} associated tickets",
            )

        db.delete(user)
        db.commit()


# ===== TICKET ENDPOINTS =====


@app.post("/tickets", response_model=schemas.Ticket, status_code=201)
def create_ticket(
    ticket: schemas.TicketCreate, db: Annotated[Session, Depends(get_db)]
):
    """Create a new ticket"""
    with dashfrog.flow("create_ticket", title=ticket.title, auto_end=False):
        with dashfrog.step("validate_users"):
            # Verify creator exists
            creator = db.query(User).filter(User.id == ticket.creator_id).first()
            if not creator:
                raise HTTPException(status_code=404, detail="Creator not found")

            # Verify assignee exists (if provided)
            assignee = None
            if ticket.assignee_id:
                assignee = db.query(User).filter(User.id == ticket.assignee_id).first()
                if not assignee:
                    raise HTTPException(status_code=404, detail="Assignee not found")

        with dashfrog.step("create_ticket_record"):
            # Create ticket with cached user info
            db_ticket = Ticket(
                title=ticket.title,
                description=ticket.description,
                creator_id=creator.id,
                creator_display_name=creator.display_name,
                creator_avatar=creator.avatar,
                assignee_id=assignee.id if assignee else None,
                assignee_display_name=assignee.display_name if assignee else None,
                assignee_avatar=assignee.avatar if assignee else None,
            )
            db.add(db_ticket)
            db.commit()
            db.refresh(db_ticket)

        with dashfrog.step("send_notification", auto_end=False, auto_start=False):
            # Trigger notification
            send_ticket_notification.delay(db_ticket.id, "created")

        return db_ticket


@app.get("/tickets", response_model=list[schemas.Ticket])
def list_tickets(
    db: Annotated[Session, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
    status: TicketStatus | None = None,
    creator_id: int | None = None,
    assignee_id: int | None = None,
):
    """List tickets with optional filters"""
    with dashfrog.flow("list_tickets"):
        query = db.query(Ticket)

        if status:
            query = query.filter(Ticket.status == status)
        if creator_id:
            query = query.filter(Ticket.creator_id == creator_id)
        if assignee_id:
            query = query.filter(Ticket.assignee_id == assignee_id)

        tickets = query.offset(skip).limit(limit).all()
        return tickets


@app.get("/tickets/{ticket_id}", response_model=schemas.Ticket)
def get_ticket(ticket_id: int, db: Annotated[Session, Depends(get_db)]):
    """Get ticket by ID"""
    with dashfrog.flow("get_ticket", ticket_id=ticket_id):
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        return ticket


@app.patch("/tickets/{ticket_id}", response_model=schemas.Ticket)
def update_ticket(
    ticket_id: int,
    ticket_update: schemas.TicketUpdate,
    db: Annotated[Session, Depends(get_db)],
):
    """Update ticket information"""
    with dashfrog.flow("update_ticket", ticket_id=ticket_id, auto_end=False):
        with dashfrog.step("fetch_ticket"):
            ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
            if not ticket:
                raise HTTPException(status_code=404, detail="Ticket not found")

        with dashfrog.step("update_fields"):
            update_data = ticket_update.model_dump(exclude_unset=True)

            # If assignee is being changed, update cached info
            if "assignee_id" in update_data:
                assignee_id = update_data["assignee_id"]
                if assignee_id:
                    assignee = db.query(User).filter(User.id == assignee_id).first()
                    if not assignee:
                        raise HTTPException(
                            status_code=404, detail="Assignee not found"
                        )
                    ticket.assignee_display_name = assignee.display_name
                    ticket.assignee_avatar = assignee.avatar
                else:
                    ticket.assignee_display_name = None
                    ticket.assignee_avatar = None

            # Update other fields
            for key, value in update_data.items():
                if key != "assignee_id" or value is not None:
                    setattr(ticket, key, value)

            db.commit()
            db.refresh(ticket)

        with dashfrog.step("send_notification", auto_end=False, auto_start=False):
            send_ticket_notification.delay(ticket_id, "updated")

        return ticket


@app.delete("/tickets/{ticket_id}", status_code=204)
def delete_ticket(ticket_id: int, db: Annotated[Session, Depends(get_db)]):
    """Delete a ticket"""
    with dashfrog.flow("delete_ticket", ticket_id=ticket_id):
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        db.delete(ticket)
        db.commit()


# ===== HEALTH & INFO ENDPOINTS =====


@app.get("/")
def root():
    """Root endpoint with API info"""
    return {
        "app": "Tasker - Ticket Management System",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "celery": "connected" if celery else "disconnected"}


# For development
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("demo.tasker.api:app", host="0.0.0.0", port=8000, reload=True)
