from datetime import datetime

from pydantic import BaseModel, EmailStr


# User schemas
class UserBase(BaseModel):
    username: str
    display_name: str
    email: EmailStr
    avatar: str | None = None


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    display_name: str | None = None
    avatar: str | None = None


class User(UserBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# Ticket schemas
class TicketBase(BaseModel):
    title: str
    description: str


class TicketCreate(TicketBase):
    creator_id: int
    assignee_id: int | None = None


class TicketUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    assignee_id: int | None = None


class Ticket(TicketBase):
    id: int
    status: str
    creator_id: int
    creator_display_name: str
    creator_avatar: str | None
    assignee_id: int | None
    assignee_display_name: str | None
    assignee_avatar: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
