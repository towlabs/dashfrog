"""comment col

Revision ID: b1446e5041c9
Revises: 9c7749d989a7
Create Date: 2025-11-28 08:28:45.673553

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b1446e5041c9'
down_revision: Union[str, None] = '9c7749d989a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('comment',
    sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
    sa.Column('emoji', sa.String(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('start', sa.DateTime(), nullable=False),
    sa.Column('end', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('comment')
