class NoteLockedException(Exception):
    """Exception raised when attempting to modify a locked note."""

    def __init__(self, note_id: int):
        self.note_id = note_id
        super().__init__(f"Note {note_id} is locked and cannot be modified")