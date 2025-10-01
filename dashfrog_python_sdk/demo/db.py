from contextlib import contextmanager
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

engine = create_engine("sqlite:///demo.db")
sessionmaker = sessionmaker(engine)


class Base(DeclarativeBase):
    pass


@contextmanager
def session():
    session = sessionmaker()
    with session.begin():
        try:
            yield session
        except Exception as e:
            session.rollback()
            raise e
        else:
            session.commit()


class DemoUser(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)


class DemoItem(Base):
    __tablename__ = "item"

    id = Column(Integer, primary_key=True, autoincrement=True)
    test = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.now)


Base.metadata.create_all(engine)


def count_users() -> int:
    with session() as conn:
        return int(conn.execute(text("SELECT COUNT(*) FROM user")).scalar())
