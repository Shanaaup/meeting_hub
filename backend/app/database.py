"""
Async SQLAlchemy database engine and session management.
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables."""
    async with engine.begin() as conn:
        from app.models import User, Meeting, Decision, ActionItem, SentimentSegment  # noqa
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Dependency: yield an async session."""
    async with async_session() as session:
        async with session.begin():
            yield session
