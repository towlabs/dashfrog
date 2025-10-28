"""initial tables

Revision ID: bf277d8d0950
Revises:
Create Date: 2025-10-27 15:40:45.228494

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "bf277d8d0950"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "blocknote",
        sa.Column("uuid", sa.String(), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("uuid"),
    )
    op.create_table(
        "event",
        sa.Column("uuid", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("labels", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("ended_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("uuid"),
    )
    op.create_table(
        "labels",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("display_as", sa.String(), nullable=True),
        sa.Column("hide", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("display_as"),
        sa.UniqueConstraint("label"),
    )
    op.create_table(
        "metrics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("kind", sa.Enum("events", "values", "distribution", name="metric_kind"), nullable=False),
        sa.Column("scope", sa.String(), nullable=False),
        sa.Column("display_as", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("unit", sa.String(), nullable=True),
        sa.Column("associated_identifiers", sa.ARRAY(sa.String()), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("display_as"),
        sa.UniqueConstraint("key"),
    )
    op.create_table(
        "metrics_scrapped",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ran_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ran_at"),
    )
    op.create_table(
        "label_usage",
        sa.Column("label_id", sa.Integer(), nullable=False),
        sa.Column("used_in", sa.String(), nullable=False),
        sa.Column("kind", sa.Enum("workflow", "metrics", name="label_src_kind"), nullable=False),
        sa.ForeignKeyConstraint(["label_id"], ["labels.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("label_id", "used_in"),
    )
    op.create_table(
        "label_values",
        sa.Column("label_id", sa.Integer(), nullable=False),
        sa.Column("value", sa.String(), nullable=False),
        sa.Column("mapped_to", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["label_id"], ["labels.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("label_id", "value"),
    )
    op.create_table(
        "note",
        sa.Column("uuid", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("locked", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("blocknote_uuid", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(
            ["blocknote_uuid"],
            ["blocknote.uuid"],
        ),
        sa.PrimaryKeyConstraint("uuid"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("note")
    op.drop_table("label_values")
    op.drop_table("label_usage")
    op.drop_table("metrics_scrapped")
    op.drop_table("metrics")
    op.drop_table("labels")
    op.drop_table("event")
    op.drop_table("blocknote")
