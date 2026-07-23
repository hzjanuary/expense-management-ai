from datetime import UTC, datetime

import pytest

from app.domain.time_ranges import (
    TimeRangeValidationError,
    month_range_utc,
    week_range_utc,
)


def test_month_range_uses_product_timezone_boundaries() -> None:
    start, end = month_range_utc(2026, 7, "Asia/Ho_Chi_Minh")

    assert start == datetime(2026, 6, 30, 17, 0, tzinfo=UTC)
    assert end == datetime(2026, 7, 31, 17, 0, tzinfo=UTC)


def test_month_range_handles_december_rollover() -> None:
    start, end = month_range_utc(2026, 12, "Asia/Ho_Chi_Minh")

    assert start == datetime(2026, 11, 30, 17, 0, tzinfo=UTC)
    assert end == datetime(2026, 12, 31, 17, 0, tzinfo=UTC)


def test_month_range_rejects_invalid_timezone() -> None:
    with pytest.raises(TimeRangeValidationError, match="timezone is invalid"):
        month_range_utc(2026, 7, "Not/A_Timezone")


def test_month_range_rejects_invalid_month() -> None:
    with pytest.raises(TimeRangeValidationError, match="month"):
        month_range_utc(2026, 13, "Asia/Ho_Chi_Minh")


def test_week_range_uses_product_timezone_boundaries() -> None:
    start, end = week_range_utc(
        datetime(2026, 7, 15, 3, 0, tzinfo=UTC),
        "Asia/Ho_Chi_Minh",
    )

    assert start == datetime(2026, 7, 12, 17, 0, tzinfo=UTC)
    assert end == datetime(2026, 7, 19, 17, 0, tzinfo=UTC)


def test_week_range_rejects_invalid_timezone() -> None:
    with pytest.raises(TimeRangeValidationError, match="timezone is invalid"):
        week_range_utc(datetime(2026, 7, 15, 3, 0, tzinfo=UTC), "Not/A_Timezone")
