"""notebook extra cols

Revision ID: 03da39980edf
Revises: 874ee482e31f
Create Date: 2025-11-17 21:22:27.573623

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "03da39980edf"
down_revision: Union[str, None] = "874ee482e31f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("notebook", sa.Column("filters", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("notebook", sa.Column("time_window", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column("notebook", "time_window")
    op.drop_column("notebook", "filters")
