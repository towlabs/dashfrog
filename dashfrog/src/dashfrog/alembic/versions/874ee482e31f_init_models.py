"""init models

Revision ID: 874ee482e31f
Revises:
Create Date: 2025-11-17 15:35:51.385224

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "874ee482e31f"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "flow",
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("labels", postgresql.ARRAY(sa.String()), nullable=False),
        sa.PrimaryKeyConstraint("name"),
    )
    op.create_table(
        "flow_event",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("flow_id", sa.String(), nullable=False),
        sa.Column("event_name", sa.String(), nullable=False),
        sa.Column("event_dt", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("labels", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("group_id", sa.String(), nullable=False),
        sa.Column("tenant", sa.String(), nullable=False),
        sa.Column("flow_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_flow_event_event_dt_brin", "flow_event", ["event_dt"], unique=False, postgresql_using="brin")
    op.create_table(
        "metric",
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("pretty_name", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("unit", sa.String(), nullable=False),
        sa.Column("labels", postgresql.ARRAY(sa.String()), nullable=False),
        sa.PrimaryKeyConstraint("name"),
    )
    op.create_table(
        "notebook",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("blocks", postgresql.ARRAY(postgresql.JSONB(astext_type=sa.Text())), nullable=True),
        sa.Column("tenant", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("notebook")
    op.drop_table("metric")
    op.drop_index("ix_flow_event_event_dt_brin", table_name="flow_event", postgresql_using="brin")
    op.drop_table("flow_event")
    op.drop_table("flow")
