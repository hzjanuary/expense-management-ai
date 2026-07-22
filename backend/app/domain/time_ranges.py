from datetime import UTC, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


class TimeRangeValidationError(ValueError):
    """Raised when a product time range cannot be constructed safely."""


def month_range_utc(
    year: int,
    month: int,
    timezone: str,
) -> tuple[datetime, datetime]:
    """Return the selected product-local month as a half-open UTC range."""

    if year < 1900 or year > 9999:
        raise TimeRangeValidationError("year must be between 1900 and 9999")
    if month < 1 or month > 12:
        raise TimeRangeValidationError("month must be between 1 and 12")

    try:
        zone = ZoneInfo(timezone)
    except ZoneInfoNotFoundError as error:
        raise TimeRangeValidationError("timezone is invalid") from error

    start_local = datetime(year, month, 1, tzinfo=zone)
    if month == 12:
        end_local = datetime(year + 1, 1, 1, tzinfo=zone)
    else:
        end_local = datetime(year, month + 1, 1, tzinfo=zone)

    return start_local.astimezone(UTC), end_local.astimezone(UTC)
