from enum import StrEnum


class TransactionType(StrEnum):
    EXPENSE = "expense"
    INCOME = "income"
    TRANSFER = "transfer"


class CategoryType(StrEnum):
    EXPENSE = "expense"
    INCOME = "income"
    TRANSFER = "transfer"
