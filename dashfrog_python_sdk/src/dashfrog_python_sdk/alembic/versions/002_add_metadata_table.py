"""Add dashfrog_metadata table for tracking refresh state

Revision ID: 002
Revises: 001
Create Date: 2025-11-03

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create dashfrog_metadata table."""

    # Create dashfrog_metadata table
    op.create_table(
        "dashfrog_metadata",
        sa.Column("id", sa.BigInteger(), autoincrement=False, nullable=False),
        sa.Column("last_refresh_ts", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # Insert initial row (id=1) for tracking refresh state
    op.execute("""
        INSERT INTO dashfrog_metadata (id, last_refresh_ts)
        VALUES (1, null);
    """)


def downgrade() -> None:
    """Drop dashfrog_metadata table."""

    op.drop_table("dashfrog_metadata")
