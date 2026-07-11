from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Declarative base for future product models.

    US-103 intentionally defines metadata only. Product domain tables are added
    by later stories.
    """
