from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool, QueuePool

from app.core.config import settings

# Configure connection pooling:
# - pool_size: number of connections to keep in pool (5 default too small)
# - max_overflow: extra connections beyond pool_size (10 default)
# - pool_recycle: recycle connections after 1 hour (prevent stale connections after inactivity)
# - pool_pre_ping: test connection before using (verify still alive)
engine = create_engine(
    settings.database_url,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,  # Recycle after 1 hour
    pool_pre_ping=True,
    connect_args={"connect_timeout": 10, "application_name": "thokan_cloud"},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
