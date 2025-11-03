"""Initial schema with Event table and Flow/Label materialized views

Revision ID: 001
Revises:
Create Date: 2025-11-03

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create Event table and Flow/Label materialized views."""

    # Create Event table
    op.create_table(
        "event",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("flow_id", sa.String(), nullable=False),
        sa.Column("event_name", sa.String(), nullable=False),
        sa.Column("event_dt", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("labels", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create BRIN index for time-ordered queries
    op.create_index("ix_event_event_dt_brin", "event", ["event_dt"], unique=False, postgresql_using="brin")

    # Create Flow materialized view
    # Flow name is extracted from labels->>'dashfrog.flow.flow_name'
    op.execute("""
        CREATE MATERIALIZED VIEW flow AS
        SELECT
            labels->>'flow_name' as name,
            ARRAY_AGG(DISTINCT labels->>'step_name')
                FILTER (WHERE labels->>'step_name' IS NOT NULL) as steps
        FROM event
        WHERE event_name = 'flow_start'
          AND labels ? 'flow_name'
        GROUP BY labels->>'flow_name';
    """)

    # Create unique index on Flow view for concurrent refreshes
    op.execute("CREATE UNIQUE INDEX ix_flow_name ON flow(name);")

    # Create Label materialized view
    # Aggregates all unique label keys and their possible values
    op.execute("""
        CREATE MATERIALIZED VIEW label AS
        SELECT
            label_key as name,
            ARRAY_AGG(DISTINCT label_value) as values
        FROM (
            SELECT
                jsonb_object_keys(labels) as label_key,
                (jsonb_each_text(labels)).value as label_value
            FROM event
            WHERE labels IS NOT NULL AND labels != '{}'::jsonb
        ) label_pairs
        GROUP BY label_key;
    """)

    # Create unique index on Label view for concurrent refreshes
    op.execute("CREATE UNIQUE INDEX ix_label_name ON label(name);")


def downgrade() -> None:
    """Drop all tables and views."""

    # Drop materialized views (CASCADE will drop their indexes)
    op.execute("DROP MATERIALIZED VIEW IF EXISTS label CASCADE;")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS flow CASCADE;")

    # Drop Event table indexes and table
    op.drop_index("ix_event_event_dt_brin", table_name="event")
    op.drop_table("event")
