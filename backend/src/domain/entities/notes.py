from pydantic import BaseModel


class Block(BaseModel):
    id: str
    kind: str  # Internal: 'paragraph', 'heading', 'bulletListItem', etc.
    content: dict
    position: int


class Note(BaseModel):
    id: int
    title: str
    description: str | None = None
    blocks: list[Block] = []