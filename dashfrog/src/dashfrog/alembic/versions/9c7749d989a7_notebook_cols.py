"""notebook cols

Revision ID: 9c7749d989a7
Revises: 03da39980edf
Create Date: 2025-11-27 13:53:42.159828

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "9c7749d989a7"
down_revision: Union[str, None] = "03da39980edf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("notebook", sa.Column("is_public", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("notebook", sa.Column("flow_blocks_filters", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column(
        "notebook", sa.Column("metric_blocks_filters", postgresql.JSONB(astext_type=sa.Text()), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("notebook", "metric_blocks_filters")
    op.drop_column("notebook", "flow_blocks_filters")
    op.drop_column("notebook", "is_public")
