
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker


class Base(DeclarativeBase):
    pass


class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(200))
    avatar: Mapped[str] = mapped_column(String(500), nullable=True)
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relations
    created_tickets: Mapped[list["Ticket"]] = relationship(
        "Ticket", back_populates="creator", foreign_keys="Ticket.creator_id"
    )
    assigned_tickets: Mapped[list["Ticket"]] = relationship(
        "Ticket", back_populates="assignee", foreign_keys="Ticket.assignee_id"
    )


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[TicketStatus] = mapped_column(String(50), default=TicketStatus.OPEN)

    # Cached user info for display (updated by Celery task)
    creator_display_name: Mapped[str] = mapped_column(String(200))
    creator_avatar: Mapped[str] = mapped_column(String(500), nullable=True)
    assignee_display_name: Mapped[str] = mapped_column(String(200), nullable=True)
    assignee_avatar: Mapped[str] = mapped_column(String(500), nullable=True)

    # Foreign keys
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    assignee_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    creator: Mapped[User] = relationship("User", foreign_keys=[creator_id], back_populates="created_tickets")
    assignee: Mapped[User] = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_tickets")


# Database setup
engine = create_engine("sqlite:///demo_tasker.db", echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
